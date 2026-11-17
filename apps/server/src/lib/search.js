export function normalize(text) {
  return String(text)
    .toLocaleLowerCase('mn')
    .replace(/ё/g, 'е')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();
}

export function tokenize(text) {
  const n = normalize(text);
  return n ? n.split(' ') : [];
}

class TrieNode {
  constructor() {
    this.children = new Map();
    this.ids = new Set();
  }
}

export class Trie {
  constructor() {
    this.root = new TrieNode();
  }

  insert(word, id) {
    let node = this.root;
    for (const ch of word) {
      if (!node.children.has(ch)) node.children.set(ch, new TrieNode());
      node = node.children.get(ch);
      node.ids.add(id);
    }
  }

  find(prefix) {
    let node = this.root;
    for (const ch of prefix) {
      node = node.children.get(ch);
      if (!node) return new Set();
    }
    return node.ids;
  }
}

export class SearchIndex {
  constructor({ getVideos, getUser, getViews }) {
    this.getVideos = getVideos;
    this.getUser = getUser;
    this.getViews = getViews;
    this.rebuild();
  }

  rebuild() {
    this.phrases = [];
    this.phraseTrie = new Trie();
    this.videoTrie = new Trie();
    this.titleTrie = new Trie();
    const seen = new Set();

    const addPhrase = (text, weight) => {
      const key = normalize(text);
      if (!key || seen.has(key)) return;
      seen.add(key);
      const index = this.phrases.length;
      this.phrases.push({ text, key, weight });
      for (const w of key.split(' ')) this.phraseTrie.insert(w, index);
    };

    for (const v of this.getVideos()) {
      const channel = this.getUser(v.channelId);
      const views = this.getViews(v.id);
      addPhrase(v.title, views);
      for (const t of v.tags || []) addPhrase(t, views / 10);
      if (channel) addPhrase(channel.displayName, views / 5);

      const text = [v.title, v.description, ...(v.tags || []), channel?.displayName, channel?.username].join(' ');
      for (const w of new Set(tokenize(text))) this.videoTrie.insert(w, v.id);
      for (const w of new Set(tokenize(v.title))) this.titleTrie.insert(w, v.id);
    }
  }

  suggest(query, limit = 8) {
    const q = normalize(query);
    if (!q) return [];
    const words = q.split(' ');

    let candidates = null;
    for (const w of words) {
      const ids = this.phraseTrie.find(w);
      candidates = candidates ? new Set([...candidates].filter((id) => ids.has(id))) : new Set(ids);
      if (!candidates.size) break;
    }

    if (!candidates || !candidates.size) {
      candidates = new Set();
      this.phrases.forEach((p, i) => p.key.includes(q) && candidates.add(i));
    }

    return [...candidates]
      .map((i) => {
        const p = this.phrases[i];
        let score = 0;
        if (p.key.startsWith(q)) score += 1000;
        else if (p.key.includes(q)) score += 500;
        score += Math.log10(1 + p.weight);
        return { text: p.text, score };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map((s) => s.text);
  }

  searchVideos(query) {
    const words = tokenize(query);
    if (!words.length) return [];
    const hits = new Map();
    const titleHits = new Map();
    for (const w of words) {
      for (const id of this.videoTrie.find(w)) hits.set(id, (hits.get(id) || 0) + 1);
      for (const id of this.titleTrie.find(w)) titleHits.set(id, (titleHits.get(id) || 0) + 1);
    }
    const q = normalize(query);
    const videos = new Map(this.getVideos().map((v) => [v.id, v]));
    return [...hits.entries()]
      .map(([id, count]) => {
        const title = normalize(videos.get(id).title);
        let score = count * 100 + (titleHits.get(id) || 0) * 300;
        if (count === words.length) score += 1000;
        if (title.includes(q)) score += 500;
        score += Math.log10(1 + this.getViews(id));
        return { id, score };
      })
      .sort((a, b) => b.score - a.score)
      .map((x) => x.id);
  }
}
