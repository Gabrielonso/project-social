export enum CallRejectReason {
  BLOCKED = 'blocked',
  CALLER_BUSY = 'caller_busy',
  CALLEE_BUSY = 'callee_busy',
  CALLEE_UNAVAILABLE = 'callee_unavailable',
  INVALID_TARGET = 'invalid_target',
  DECLINED = 'declined',
  MISSED = 'missed',
  CANCELLED = 'cancelled',
}
