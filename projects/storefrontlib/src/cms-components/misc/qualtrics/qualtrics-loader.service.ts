import {
  Injectable,
  isDevMode,
  Renderer2,
  RendererFactory2,
} from '@angular/core';
import { WindowRef } from '@spartacus/core';
import { fromEvent, Observable, of } from 'rxjs';
import { filter, map, switchMap, tap } from 'rxjs/operators';

/**
 * Service to integration Qualtrics.
 *
 * The integration observes the Qualtrics API, and when available, it runs the QSI API
 * to let Qualtrics evaluate the application.
 *
 * The service supports an additional _hook_ (`isDataLoaded()`) that can be used to load application
 * data before pulling the QSI API. This is benefitial in a single page application when additional
 * data is required befor the Qualtrics _creatives_ run.
 *
 * This service also supports the creation of the Qualtrics deployment script. This is optional, as
 * the script can be added in various ways.
 */
@Injectable({
  providedIn: 'root',
})
export class QualtricsLoaderService {
  /**
   * Reference to the QSI API.
   */
  protected qsiApi: any;

  /**
   * QSI load event that happens when the QSI JS file is loaded.
   */
  private qsiLoaded$: Observable<any> = this.winRef?.nativeWindow
    ? fromEvent(this.winRef.nativeWindow, 'qsi_js_loaded')
    : of();

  /**
   * Emits the Qualtrics Site Intercept (QSI) JavaScript API whenever available.
   *
   * The API is emitted when the JavaScript resource holding this API is fully loaded.
   * The API is also stored locally in the service, in case it's required later on.
   */
  protected qsi$: Observable<any> = this.qsiLoaded$.pipe(
    switchMap(() => this.isDataLoaded()),
    map(() => this.winRef.nativeWindow['QSI']),
    filter((api) => Boolean(api)),
    tap((qsi) => {
      this.qsiApi = qsi;
    })
  );

  constructor(
    protected winRef: WindowRef,
    protected rendererFactory: RendererFactory2
  ) {
    this.initialize();
  }

  /**
   * Starts observing the Qualtrics integration. The integration is based on a
   * Qualtrics specific event (`qsi_js_loaded`). As soon as this events happens,
   * we run the API.
   */
  protected initialize() {
    this.qsi$.subscribe(() => this.run());
  }

  /**
   * Evaluates the Qualtrics project code for the application.
   *
   * In order to reload the evaulation in Qualtrics, the API requires to unload the API before
   * running it again. We don't do this by default, but offer a flag to conditionally unload the API.
   */
  protected run(reload = false): void {
    if (!this.qsiApi?.API) {
      if (isDevMode()) {
        console.log('The QSI api is not available');
      }
      return;
    }

    if (reload) {
      // Removes any currently displaying creatives
      this.qsiApi.API.unload();
    }

    // Starts the intercept code evaluation right after loading the Site Intercept
    // code for any defined intercepts or creatives
    this.qsiApi.API.load().done(this.qsiApi.API.run());
  }

  /**
   * Adds the deployment script to the DOM. If the deployment script is not
   *
   * The script will not be added twice if it was loaded before. In that case, we _run_
   * the Qualtrics API straight away.
   */
  addScript(scriptSource: string): void {
    if (this.hasScript(scriptSource)) {
      this.run(true);
    } else {
      const script: HTMLScriptElement = this.renderer.createElement('script');
      script.type = 'text/javascript';
      script.defer = true;
      script.src = scriptSource;
      this.renderer.appendChild(this.winRef.document.body, script);
    }
  }

  /**
   * This logic exist in order to let the client(s) add their own logic to wait for any kind of page data.
   * You can observe any data in this method.
   *
   * Defaults to true.
   */
  protected isDataLoaded(): Observable<boolean> {
    return of(true);
  }

  /**
   * Indicatas that the script is already added to the DOM.
   */
  protected hasScript(source?: string): boolean {
    return !!this.winRef.document?.querySelector(`script[src="${source}"]`);
  }

  protected get renderer(): Renderer2 {
    return this.rendererFactory.createRenderer(null, null);
  }
}
