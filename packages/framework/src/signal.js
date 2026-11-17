let activeEffect = null;

const queue = new Set();

let flushScheduled = false;

function flush() {
  flushScheduled = false;
  const effects = [...queue];
  queue.clear();
  for (const e of effects) {
    if (!e.disposed) e.run();
  }
}

function schedule(effect) {
  queue.add(effect);
  if (!flushScheduled) {
    flushScheduled = true;
    queueMicrotask(flush);
  }
}

export class Signal {
  constructor(initialValue) {
    this._value = initialValue;
    this._subscribers = new Set();
  }

  get value() {
    if (activeEffect) {
      this._subscribers.add(activeEffect);
      activeEffect.deps.add(this);
    }
    return this._value;
  }

  set value(next) {
    if (Object.is(next, this._value)) return;
    this._value = next;
    for (const effect of [...this._subscribers]) effect.notify();
  }

  peek() {
    return this._value;
  }

  update(fn) {
    this.value = fn(this._value);
  }
}

class Effect {
  constructor(fn, { sync = false } = {}) {
    this.fn = fn;
    this.sync = sync;
    this.deps = new Set();
    this.cleanup = null;
    this.disposed = false;
  }

  notify() {
    if (this.disposed) return;
    if (this.sync) this.run();
    else schedule(this);
  }

  _unsubscribeAll() {
    for (const dep of this.deps) dep._subscribers.delete(this);
    this.deps.clear();
  }

  run() {
    if (this.disposed) return;
    if (typeof this.cleanup === 'function') this.cleanup();
    this._unsubscribeAll();
    const prev = activeEffect;
    activeEffect = this;
    try {
      this.cleanup = this.fn();
    } finally {
      activeEffect = prev;
    }
  }

  dispose() {
    this.disposed = true;
    if (typeof this.cleanup === 'function') this.cleanup();
    this._unsubscribeAll();
  }
}

export function signal(initialValue) {
  return new Signal(initialValue);
}

export function effect(fn, options) {
  const e = new Effect(fn, options);
  e.run();
  return () => e.dispose();
}

export function computed(fn) {
  const s = new Signal(undefined);
  effect(() => {
    s.value = fn();
  }, { sync: true });
  return s;
}

export function untrack(fn) {
  const prev = activeEffect;
  activeEffect = null;
  try {
    return fn();
  } finally {
    activeEffect = prev;
  }
}
