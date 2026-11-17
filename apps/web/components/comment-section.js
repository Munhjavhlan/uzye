import { Component, html, css, signal, resource, api } from '@uzye/framework';
import { formatCount, timeAgo } from '@uzye/ui';
import { session, requireAuth, toast } from '../state.js';

export class CommentSection extends Component {
  static props = { videoId: { type: String, attribute: true, default: '' } };

  sort = signal('top');
  replyTo = signal(null);
  expanded = signal(new Set());
  composing = signal(false);
  sortMenu = signal(false);
  posting = signal(false);

  comments = resource((id, sort) => api.get(`/api/videos/${id}/comments?sort=${sort}`));

  static styles = css`
    :host { display: block; margin-top: 24px; }
    .head { display: flex; align-items: center; gap: 32px; margin-bottom: 24px; }
    .head h2 { margin: 0; font-size: 20px; font-weight: 700; }
    .sort { position: relative; }
    .sort > button { display: flex; align-items: center; gap: 8px; border: 0; background: none; cursor: pointer; font-weight: 500; font-size: 14px; }
    .sort .menu { position: absolute; top: 32px; left: 0; z-index: 10; padding: 8px 0; min-width: 160px; background: var(--bg-elev); border-radius: 12px; box-shadow: var(--shadow); }
    .sort .menu button { display: block; width: 100%; padding: 10px 16px; border: 0; background: none; text-align: left; cursor: pointer; font-size: 14px; }
    .sort .menu button:hover, .sort .menu button.sel { background: var(--bg-hover); }

    .composer { display: flex; gap: 16px; margin-bottom: 32px; }
    .composer.reply { margin: 8px 0 16px; }
    .composer.reply .avatar { width: 24px; height: 24px; font-size: 11px; }
    .composer .body { flex: 1; }
    textarea {
      width: 100%; min-height: 24px; padding: 2px 0 4px; resize: none; overflow: hidden;
      border: 0; border-bottom: 1px solid var(--border); background: transparent; color: var(--text);
      font: inherit; font-size: 14px; outline: none;
    }
    textarea:focus { border-bottom: 2px solid var(--text); }
    .buttons { display: flex; justify-content: flex-end; gap: 8px; margin-top: 8px; }

    .comment { display: flex; gap: 16px; margin-bottom: 16px; }
    .comment .avatar { width: 40px; height: 40px; }
    .replies .comment .avatar { width: 24px; height: 24px; font-size: 11px; }
    .comment .main { flex: 1; min-width: 0; }
    .author { font-size: 13px; font-weight: 500; margin-bottom: 2px; }
    .author .time { color: var(--text-2); font-weight: 400; margin-left: 4px; }
    .author .creator { padding: 1px 8px; border-radius: 12px; background: var(--bg-chip); }
    .text { font-size: 14px; line-height: 20px; white-space: pre-wrap; word-wrap: break-word; }
    .actions { display: flex; align-items: center; gap: 4px; margin-top: 4px; margin-left: -8px; }
    .actions .icon-btn { width: 32px; height: 32px; }
    .actions .icon-btn ui-icon { width: 18px; height: 18px; }
    .actions .icon-btn.on { color: var(--link); }
    .actions .count { font-size: 12px; color: var(--text-2); min-width: 16px; }
    .actions .btn { height: 32px; padding: 0 12px; font-size: 12px; background: none; }
    .actions .btn:hover { background: var(--bg-hover); }
    .toggle-replies { color: var(--link); background: none; font-weight: 500; }
    .toggle-replies:hover { background: var(--link-bg) !important; }
    .replies { margin-top: 8px; }
    .empty { color: var(--text-2); padding: 16px 0; }
  `;

  onMount() {
    this.effect(() => {
      if (this.videoId) this.comments.load(this.videoId, this.sort.value);
    });
  }

  autoGrow(e) {
    e.target.style.height = 'auto';
    e.target.style.height = e.target.scrollHeight + 'px';
  }

  onComposerFocus = (e) => {
    if (!requireAuth('Сэтгэгдэл бичих үү?', 'Сэтгэгдэл бичихийн тулд нэвтэрнэ үү.')) {
      e.target.blur();
      return;
    }
    this.composing.value = true;
  };

  async post(textarea, parentId = null) {
    const text = textarea.value.trim();
    if (!text || this.posting.peek()) return;
    this.posting.value = true;
    try {
      const { comment } = await api.post(`/api/videos/${this.videoId}/comments`, { text, parentId });
      textarea.value = '';
      textarea.style.height = 'auto';
      this.comments.mutate((d) => {
        if (!comment.parentId) return { count: d.count + 1, comments: [comment, ...d.comments] };
        this.expanded.value = new Set([...this.expanded.peek(), comment.parentId]);
        return {
          count: d.count + 1,
          comments: d.comments.map((c) => (c.id === comment.parentId ? { ...c, replies: [...c.replies, comment] } : c)),
        };
      });
      this.composing.value = false;
      this.replyTo.value = null;
    } catch (err) {
      toast('Алдаа: ' + err.message);
    } finally {
      this.posting.value = false;
    }
  }

  async like(c) {
    if (!requireAuth('Сэтгэгдэл таалагдсан уу?', 'Like дарахын тулд нэвтэрнэ үү.')) return;
    const update = (patch) =>
      this.comments.mutate((d) => ({
        ...d,
        comments: d.comments.map((x) =>
          x.id === c.id ? { ...x, ...patch } : { ...x, replies: x.replies.map((r) => (r.id === c.id ? { ...r, ...patch } : r)) }
        ),
      }));
    update({ liked: !c.liked, likes: c.likes + (c.liked ? -1 : 1) });
    try {
      const res = await api.post(`/api/comments/${c.id}/like`);
      update(res);
    } catch (err) {
      update({ liked: c.liked, likes: c.likes });
      toast('Алдаа: ' + err.message);
    }
  }

  async remove(c) {
    if (!confirm('Энэ сэтгэгдлийг устгах уу?')) return;
    try {
      const { removed } = await api.del(`/api/comments/${c.id}`);
      this.comments.mutate((d) => ({
        count: d.count - removed,
        comments: d.comments
          .filter((x) => x.id !== c.id)
          .map((x) => ({ ...x, replies: x.replies.filter((r) => r.id !== c.id) })),
      }));
      toast('Сэтгэгдэл устгагдлаа');
    } catch (err) {
      toast('Алдаа: ' + err.message);
    }
  }

  toggleReplies(id) {
    const s = new Set(this.expanded.peek());
    s.has(id) ? s.delete(id) : s.add(id);
    this.expanded.value = s;
  }

  openReply(c) {
    if (!requireAuth('Хариулах уу?', 'Хариулт бичихийн тулд нэвтэрнэ үү.')) return;
    this.replyTo.value = c.id;
  }

  composer(parentId) {
    const user = session.value.user;
    const isReply = Boolean(parentId);
    const open = isReply || this.composing.value;
    return html`
      <div class=${'composer' + (isReply ? ' reply' : '')}>
        ${user ? html`<span class="avatar" style=${'background:' + user.avatarColor}>${user.displayName[0]}</span>` : html`<span class="avatar" style="background:#888"><ui-icon name="user"></ui-icon></span>`}
        <div class="body">
          <textarea rows="1" placeholder=${isReply ? 'Хариулт нэмэх...' : 'Сэтгэгдэл нэмэх...'} @focus=${isReply ? null : this.onComposerFocus} @input=${this.autoGrow}
            @keydown=${(e) => e.key === 'Enter' && (e.ctrlKey || e.metaKey) && this.post(e.target, parentId)}></textarea>
          ${open
            ? html`<div class="buttons">
                <button class="btn ghost" @click=${() => (isReply ? (this.replyTo.value = null) : (this.composing.value = false))}>Болих</button>
                <button class="btn blue" ?disabled=${this.posting.value} @click=${(e) => this.post(e.target.closest('.body').querySelector('textarea'), parentId)}>${isReply ? 'Хариулах' : 'Сэтгэгдэл'}</button>
              </div>`
            : ''}
        </div>
      </div>
    `;
  }

  item(c, isReply = false) {
    const a = c.author;
    const expanded = this.expanded.value.has(c.id);
    return html`
      <div class="comment">
        <a class="avatar" href=${'/@' + a.username} style=${'background:' + a.avatarColor}>${a.displayName[0]}</a>
        <div class="main">
          <div class="author">
            <a class=${c.isCreator ? 'creator' : ''} href=${'/@' + a.username}>@${a.username}</a>
            <span class="time">${timeAgo(c.createdAt)}</span>
          </div>
          <div class="text">${c.text}</div>
          <div class="actions">
            <button class=${'icon-btn' + (c.liked ? ' on' : '')} @click=${() => this.like(c)} aria-label="Таалагдлаа"><ui-icon name="like"></ui-icon></button>
            <span class="count">${c.likes ? formatCount(c.likes) : ''}</span>
            <button class="btn" @click=${() => this.openReply(c)}>Хариулах</button>
            ${c.canDelete ? html`<button class="icon-btn" @click=${() => this.remove(c)} title="Устгах"><ui-icon name="trash"></ui-icon></button>` : ''}
          </div>
          ${this.replyTo.value === c.id ? this.composer(c.parentId || c.id) : ''}
          ${!isReply && c.replies.length
            ? html`
                <button class="btn toggle-replies" @click=${() => this.toggleReplies(c.id)}>
                  <ui-icon name="chevron" style=${expanded ? 'transform:rotate(180deg)' : ''}></ui-icon>${c.replies.length} хариулт
                </button>
                ${expanded ? html`<div class="replies">${c.replies.map((r) => this.item(r, true))}</div>` : ''}`
            : ''}
        </div>
      </div>
    `;
  }

  render() {
    const data = this.comments.data.value;
    return html`
      <div class="head">
        <h2>${data ? `${data.count} сэтгэгдэл` : 'Сэтгэгдэл'}</h2>
        <div class="sort">
          <button @click=${() => this.sortMenu.update((v) => !v)}><ui-icon name="sort"></ui-icon>Эрэмбэлэх</button>
          ${this.sortMenu.value
            ? html`<div class="menu" @click=${() => (this.sortMenu.value = false)}>
                <button class=${this.sort.value === 'top' ? 'sel' : ''} @click=${() => (this.sort.value = 'top')}>Шилдэг сэтгэгдэл</button>
                <button class=${this.sort.value === 'new' ? 'sel' : ''} @click=${() => (this.sort.value = 'new')}>Хамгийн шинэ</button>
              </div>`
            : ''}
        </div>
      </div>
      ${this.composer(null)}
      ${data
        ? data.comments.length
          ? data.comments.map((c) => this.item(c))
          : html`<div class="empty">Одоогоор сэтгэгдэл алга. Эхнийх нь болоорой!</div>`
        : html`<div class="skeleton" style="height:60px"></div>`}
    `;
  }
}
