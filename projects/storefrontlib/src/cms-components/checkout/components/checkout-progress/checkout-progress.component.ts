import {
  Component,
  ChangeDetectionStrategy,
  OnInit,
  ChangeDetectorRef,
  OnDestroy,
} from '@angular/core';
import { CheckoutStepService } from '../../services/checkout-step.service';
import { CheckoutStep } from '../../model/checkout-step.model';
import { Observable, Subscription } from 'rxjs';
import { tap } from 'rxjs/operators';

@Component({
  selector: 'cx-checkout-progress',
  templateUrl: './checkout-progress.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CheckoutProgressComponent implements OnInit, OnDestroy {
  constructor(
    protected checkoutStepService: CheckoutStepService,
    protected cdr: ChangeDetectorRef
  ) {}

  steps: CheckoutStep[];

  activeStepIndex: number;
  activeStepIndex$: Observable<
    number
  > = this.checkoutStepService.activeStepIndex$.pipe(
    tap((index) => (this.activeStepIndex = index))
  );

  subscription: Subscription;

  ngOnInit(): void {
    this.subscription = this.checkoutStepService.steps$.subscribe((steps) => {
      this.steps = steps;
      this.cdr.detectChanges();
    });
  }

  ngOnDestroy(): void {
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
  }

  getTabIndex(stepIndex: number): number {
    return !this.isActive(stepIndex) && !this.isDisabled(stepIndex) ? 0 : -1;
  }

  isActive(index: number): boolean {
    return index === this.activeStepIndex;
  }

  isDisabled(index: number): boolean {
    return index > this.activeStepIndex;
  }
}