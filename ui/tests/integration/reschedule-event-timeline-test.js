import { module, test } from 'qunit';
import { setupRenderingTest } from 'ember-qunit';
import { render, settled } from '@ember/test-helpers';
import { find, findAll } from 'ember-native-dom-helpers';
import { startMirage } from 'nomad-ui/initializers/ember-cli-mirage';
import hbs from 'htmlbars-inline-precompile';
import moment from 'moment';

module('Integration | Component | reschedule event timeline', function(hooks) {
  setupRenderingTest(hooks);

  hooks.beforeEach(function() {
    this.store = this.owner.lookup('service:store');
    this.server = startMirage();
    this.server.create('namespace');
    this.server.create('node');
    this.server.create('job', { createAllocations: false });
  });

  hooks.afterEach(function() {
    this.server.shutdown();
  });

  const commonTemplate = hbs`
    {{reschedule-event-timeline allocation=allocation}}
  `;

  test('when the allocation is running, the timeline shows past allocations', function(assert) {
    const attempts = 2;

    this.server.create('allocation', 'rescheduled', {
      rescheduleAttempts: attempts,
      rescheduleSuccess: true,
    });

    this.store.findAll('allocation');
    let allocation;

    return settled()
      .then(async () => {
        allocation = this.store
          .peekAll('allocation')
          .find(alloc => !alloc.get('nextAllocation.content'));

        this.set('allocation', allocation);
        await render(commonTemplate);

        return settled();
      })
      .then(() => {
        assert.equal(
          findAll('[data-test-allocation]').length,
          attempts + 1,
          'Total allocations equals current allocation plus all past allocations'
        );
        assert.equal(
          find('[data-test-allocation]'),
          find(`[data-test-allocation="${allocation.id}"]`),
          'First allocation is the current allocation'
        );

        assert.notOk(find('[data-test-stop-warning]'), 'No stop warning');
        assert.notOk(find('[data-test-attempt-notice]'), 'No attempt notice');

        assert.equal(
          find(
            `[data-test-allocation="${allocation.id}"] [data-test-allocation-link]`
          ).textContent.trim(),
          allocation.get('shortId'),
          'The "this" allocation is correct'
        );
        assert.equal(
          find(
            `[data-test-allocation="${allocation.id}"] [data-test-allocation-status]`
          ).textContent.trim(),
          allocation.get('clientStatus'),
          'Allocation shows the status'
        );
      });
  });

  test('when the allocation has failed and there is a follow up evaluation, a note with a time is shown', function(assert) {
    const attempts = 2;

    this.server.create('allocation', 'rescheduled', {
      rescheduleAttempts: attempts,
      rescheduleSuccess: false,
    });

    this.store.findAll('allocation');
    let allocation;

    return settled()
      .then(async () => {
        allocation = this.store
          .peekAll('allocation')
          .find(alloc => !alloc.get('nextAllocation.content'));

        this.set('allocation', allocation);
        await render(commonTemplate);

        return settled();
      })
      .then(() => {
        assert.ok(
          find('[data-test-stop-warning]'),
          'Stop warning is shown since the last allocation failed'
        );
        assert.notOk(find('[data-test-attempt-notice]'), 'Reschdule attempt notice is not shown');
      });
  });

  test('when the allocation has failed and there is no follow up evaluation, a warning is shown', async function(assert) {
    const attempts = 2;

    this.server.create('allocation', 'rescheduled', {
      rescheduleAttempts: attempts,
      rescheduleSuccess: false,
    });

    const lastAllocation = server.schema.allocations.findBy({ nextAllocation: undefined });
    lastAllocation.update({
      followupEvalId: server.create('evaluation', {
        waitUntil: moment()
          .add(2, 'hours')
          .toDate(),
      }).id,
    });

    await this.store.findAll('allocation');
    await settled();

    let allocation = this.store
      .peekAll('allocation')
      .find(alloc => !alloc.get('nextAllocation.content'));
    this.set('allocation', allocation);

    await render(commonTemplate);
    await settled();

    assert.ok(
      find('[data-test-attempt-notice]'),
      'Reschedule notice is shown since the follow up eval says so'
    );
    assert.notOk(find('[data-test-stop-warning]'), 'Stop warning is not shown');
  });

  test('when the allocation has a next allocation already, it is shown in the timeline', function(assert) {
    const attempts = 2;

    const originalAllocation = this.server.create('allocation', 'rescheduled', {
      rescheduleAttempts: attempts,
      rescheduleSuccess: true,
    });

    this.store.findAll('allocation');
    let allocation;

    return settled()
      .then(async () => {
        allocation = this.store.peekAll('allocation').findBy('id', originalAllocation.id);

        this.set('allocation', allocation);
        await render(commonTemplate);

        return settled();
      })
      .then(() => {
        assert.ok(
          find('[data-test-reschedule-label]').textContent.trim(),
          'Next Allocation',
          'The first allocation is the next allocation and labeled as such'
        );

        assert.equal(
          find('[data-test-allocation] [data-test-allocation-link]').textContent.trim(),
          allocation.get('nextAllocation.shortId'),
          'The next allocation item is for the correct allocation'
        );

        assert.equal(
          findAll('[data-test-allocation]')[1],
          find(`[data-test-allocation="${allocation.id}"]`),
          'Second allocation is the current allocation'
        );

        assert.notOk(find('[data-test-stop-warning]'), 'No stop warning');
        assert.notOk(find('[data-test-attempt-notice]'), 'No attempt notice');
      });
  });
});
