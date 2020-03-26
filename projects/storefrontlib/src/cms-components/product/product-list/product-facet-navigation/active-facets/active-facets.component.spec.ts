import {
  ChangeDetectionStrategy,
  Component,
  DebugElement,
  Input,
} from '@angular/core';
import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { RouterTestingModule } from '@angular/router/testing';
import { I18nTestingModule } from '@spartacus/core';
import { ICON_TYPE } from '../../../../misc/icon/icon.model';
import { FacetList } from '../facet.model';
import { FacetService } from '../facet.service';
import { ActiveFacetsComponent } from './active-facets.component';

@Component({
  selector: 'cx-icon',
  template: '',
})
class MockCxIconComponent {
  @Input() type: ICON_TYPE;
}
class MockFacetService {
  getLinkParams() {}
}

const mockFacetList: FacetList = {
  facets: [{ name: 'facet-A' }],
  activeFacets: [{ facetName: 'facet-B' }, { facetName: 'facet-C' }],
};

describe('ActiveFacetsComponent', () => {
  let component: ActiveFacetsComponent;
  let fixture: ComponentFixture<ActiveFacetsComponent>;
  let element: DebugElement;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      imports: [I18nTestingModule, RouterTestingModule],
      declarations: [ActiveFacetsComponent, MockCxIconComponent],
      providers: [{ provide: FacetService, useClass: MockFacetService }],
    })
      .overrideComponent(ActiveFacetsComponent, {
        set: { changeDetection: ChangeDetectionStrategy.Default },
      })
      .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ActiveFacetsComponent);
    element = fixture.debugElement;
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should not render h4 when there are no active facets', () => {
    component.facetList = null;
    fixture.detectChanges();
    const header = element.queryAll(By.css('h4'));
    expect(header.length).toBeFalsy();
  });

  it('should not render anchor links when there are no active facets', () => {
    component.facetList = null;
    fixture.detectChanges();
    const header = element.queryAll(By.css('a'));
    expect(header.length).toEqual(0);
  });

  it('should render h4 when there are active facets', () => {
    component.facetList = mockFacetList;
    fixture.detectChanges();
    const header = element.queryAll(By.css('h4'));
    expect(header).toBeTruthy();
  });

  it('should render an anchor links for every active facets', () => {
    component.facetList = mockFacetList;
    fixture.detectChanges();
    const header = element.queryAll(By.css('a'));
    expect(header.length).toEqual(2);
  });
});
