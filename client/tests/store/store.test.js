import store from '../../src/store/store';

describe('Redux store', () => {
  it('should initialize without crashing', () => {
    expect(store).toBeDefined();
    expect(store.getState()).toBeDefined();
  });
});
