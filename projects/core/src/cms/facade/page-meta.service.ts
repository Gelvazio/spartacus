import { Inject, Injectable, Optional } from '@angular/core';
import { combineLatest, Observable, of } from 'rxjs';
import {
  debounceTime,
  filter,
  map,
  shareReplay,
  switchMap,
} from 'rxjs/operators';
import { resolveApplicable } from '../../util/applicable';
import { Page, PageMeta } from '../model/page.model';
import { PageMetaResolver } from '../page/page-meta.resolver';
import { CmsService } from './cms.service';
import { UnifiedInjector } from '../../lazy-loading/unified-injector';

@Injectable({
  providedIn: 'root',
})
export class PageMetaService {
  private resolvers$: Observable<PageMetaResolver[]> = this.unifiedInjector
    ? (this.unifiedInjector
        .getMulti(PageMetaResolver)
        .pipe(shareReplay({ bufferSize: 1, refCount: true })) as Observable<
        PageMetaResolver[]
      >)
    : of(this.resolvers);

  constructor(
    @Optional()
    @Inject(PageMetaResolver)
    protected resolvers: PageMetaResolver[],
    protected cms: CmsService,
    @Optional()
    protected unifiedInjector?: UnifiedInjector
  ) {
    this.resolvers = this.resolvers || [];
  }
  /**
   * The list of resolver interfaces will be evaluated for the pageResolvers.
   *
   * TOOD: optimize browser vs SSR resolvers; image, robots and description
   *       aren't needed during browsing.
   * TODO: we can make the list of resolver types configurable
   */
  protected resolverMethods: { [key: string]: string } = {
    title: 'resolveTitle',
    heading: 'resolveHeading',
    description: 'resolveDescription',
    breadcrumbs: 'resolveBreadcrumbs',
    image: 'resolveImage',
    robots: 'resolveRobots',
  };

  getMeta(): Observable<PageMeta | null> {
    return this.cms.getCurrentPage().pipe(
      filter(Boolean),
      switchMap((page: Page) => this.getMetaResolver(page)),
      switchMap((metaResolver: PageMetaResolver) =>
        metaResolver ? this.resolve(metaResolver) : of(null)
      )
    );
  }

  /**
   * If a `PageResolver` has implemented a resolver interface, the resolved data
   * is merged into the `PageMeta` object.
   * @param metaResolver
   */
  protected resolve(metaResolver: PageMetaResolver): Observable<PageMeta> {
    const resolveMethods: Observable<PageMeta>[] = Object.keys(
      this.resolverMethods
    )
      .filter((key) => metaResolver[this.resolverMethods[key]])
      .map((key) =>
        metaResolver[this.resolverMethods[key]]().pipe(
          map((data) => ({
            [key]: data,
          }))
        )
      );

    return combineLatest(resolveMethods).pipe(
      debounceTime(0), // avoid partial data emissions when all methods resolve at the same time
      map((data) => Object.assign({}, ...data))
    );
  }

  /**
   * Return the resolver with the best match, based on a score
   * generated by the resolver.
   *
   * Resolvers match by default on `PageType` and `page.template`.
   */
  protected getMetaResolver(page: Page): Observable<PageMetaResolver> {
    return this.resolvers$.pipe(
      map((resolvers) => resolveApplicable(resolvers, [page], [page]))
    );
  }
}
