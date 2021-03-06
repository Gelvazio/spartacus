import { TestBed } from '@angular/core/testing';
import { OCC_USER_ID_ANONYMOUS } from '@spartacus/core';
import { take } from 'rxjs/operators';
import { UserIdService } from './user-id.service';
const createSpy = jasmine.createSpy;

describe('UserIdService', () => {
  let service: UserIdService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [UserIdService],
    });
    service = TestBed.inject(UserIdService);
  });

  describe('getUserId', () => {
    it('should by default return anonymous user id', (done) => {
      service
        .getUserId()
        .pipe(take(1))
        .subscribe((userId) => {
          expect(userId).toBe('anonymous');
          done();
        });
    });

    it('should return value that was set with setUserId', (done) => {
      service.setUserId('testId');
      service
        .getUserId()
        .pipe(take(1))
        .subscribe((userId) => {
          expect(userId).toBe('testId');
          done();
        });
    });
  });

  describe('clearUserId', () => {
    it('should set the value for the default', (done) => {
      const ids = [];
      service.setUserId('testId');

      service
        .getUserId()
        .pipe(take(2))
        .subscribe((userId) => {
          ids.push(userId);
          if (ids.length > 1) {
            expect(ids).toEqual(['testId', 'anonymous']);
            done();
          }
        });
      service.clearUserId();
    });
  });

  describe('invokeWithUserId', () => {
    it('should invoke callback with last user id', () => {
      service.setUserId('testId');

      const cb = createSpy();

      service.invokeWithUserId(cb);

      expect(cb).toHaveBeenCalledWith('testId');
    });
  });

  describe('isEmulated', () => {
    it('should return false for anonymous userId', (done) => {
      service
        .isEmulated()
        .pipe(take(1))
        .subscribe((userId) => {
          expect(userId).toBe(false);
          done();
        });
    });

    it('should return false for current userId', (done) => {
      service.setUserId('current');
      service
        .isEmulated()
        .pipe(take(1))
        .subscribe((userId) => {
          expect(userId).toBe(false);
          done();
        });
    });

    it('should return true for any other userId', (done) => {
      service.setUserId('someId');
      service
        .isEmulated()
        .pipe(take(1))
        .subscribe((userId) => {
          expect(userId).toBe(true);
          done();
        });
    });
  });

  describe('takeUserId', () => {
    it('should emit last value and completes', (done) => {
      service.takeUserId().subscribe(
        (id) => expect(id).toEqual(OCC_USER_ID_ANONYMOUS),
        () => {},
        () => {
          done();
        }
      );
    });

    it('should throw error when anonymous value in loggedIn mode', (done) => {
      let userId;
      service.takeUserId(true).subscribe(
        (id) => (userId = id),
        (error: Error) => {
          expect(userId).toBeUndefined();
          expect(error.message).toEqual(
            'Requested user id for logged user while user is not logged in.'
          );
          done();
        }
      );
    });

    it('should emit logged in value and completes', (done) => {
      service.setUserId('someId');
      service.takeUserId(true).subscribe(
        (id) => {
          expect(id).toEqual('someId');
        },
        () => {},
        () => {
          done();
        }
      );
    });
  });
});
