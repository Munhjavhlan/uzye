import { Component, html } from '@uzye/framework';
import { router, setToastHost, toggleWatchLater, drawerOpen } from '../state.js';

export class AppShell extends Component {
  static shadow = false;

  onMount() {
    setToastHost(this.$('ui-toast'));

    this.listen(this, 'watch-later-toggle', async (e) => {
      const { video, card } = e.detail;
      const next = await toggleWatchLater(video);
      card.video = { ...video, inWatchLater: next };
    });

    this.effect(() => {
      router.current.value;
      drawerOpen.value = false;
      document.title = 'Үзье';
    });
  }

  render() {
    return html`
      <app-header></app-header>
      <div class="app-body">
        <side-nav></side-nav>
        <main class="app-main">
          <router-view .router=${router}></router-view>
        </main>
      </div>
      <login-dialog></login-dialog>
      <ui-toast></ui-toast>
    `;
  }
}
