import { Component, RouterView } from '@uzye/framework';
import { baseStyles, defineAll } from '@uzye/ui';
import { loadSession } from './state.js';

import { AppShell } from './components/app-shell.js';
import { AppHeader } from './components/app-header.js';
import { SideNav } from './components/side-nav.js';
import { LoginDialog } from './components/login-dialog.js';
import { CommentSection } from './components/comment-section.js';

import { PageHome } from './pages/page-home.js';
import { PageWatch } from './pages/page-watch.js';
import { PageResults } from './pages/page-results.js';
import { PageChannel } from './pages/page-channel.js';
import { PageHistory } from './pages/page-history.js';
import { PageWatchLater, PageLiked } from './pages/page-playlist.js';
import { PageSubscriptions } from './pages/page-subscriptions.js';
import { PageLogin } from './pages/page-login.js';
import { PageNotFound } from './pages/page-not-found.js';

Component.sharedStyles = [baseStyles];

defineAll();
RouterView.define('router-view');

AppHeader.define('app-header');
SideNav.define('side-nav');
LoginDialog.define('login-dialog');
CommentSection.define('comment-section');

PageHome.define('page-home');
PageWatch.define('page-watch');
PageResults.define('page-results');
PageChannel.define('page-channel');
PageHistory.define('page-history');
PageWatchLater.define('page-watch-later');
PageLiked.define('page-liked');
PageSubscriptions.define('page-subscriptions');
PageLogin.define('page-login');
PageNotFound.define('page-not-found');

document.querySelector('.boot')?.remove();
AppShell.define('uzye-app');

loadSession();
