# Үзье — YouTube шиг видео платформ

Гадны framework болон library **огт ашиглаагүй**. Frontend нь өөрсдийн бичсэн **mini framework** болон **web component**-ууд дээр, backend нь Node.js-ийн built-in модулиуд (`http`, `fs`, `crypto`, `zlib`) дээр бүтээгдсэн. `package.json`-д нэг ч dependency байхгүй.

## Багшийн шаардлага ба шийдэл

| # | Шаардлага | Хэрхэн хийгдсэн | Код |
|---|-----------|-----------------|-----|
| 1 | Хайлтад бичих үед нэрс autocomplete-ээр гарах | Үсэг бүрт 150мс **debounce** хийгээд server рүү хүсэлт илгээнэ. Хуучирсан хүсэлтийг **AbortController**-оор цуцлах, хариуг **кэшлэх**, ↑↓ Enter Esc товчоор сонгох боломжтой. Server тал **Trie** (угтвар мод) бүтцээр хайна. | `packages/ui/src/search-box.js`, `apps/server/src/lib/search.js` |
| 2 | Видеог бүтнээр нь татахгүй, stream хийж үзүүлэх | Видео 4 секундын **fMP4 сегментүүдэд** хуваагдсан. Өөрсдийн бичсэн player **MediaSource API**-аар зөвхөн одоогийн байрлалаас урагш ~24 секундын сегментийг татаж залгана. Хойно үлдсэн хэсгийг санах ойгоос чөлөөлнө. Seek хийхэд шинэ байрлалаас татна. | `packages/ui/src/segment-streamer.js`, `stream-player.js` |
| 3 | Сануулсан видео Watch later жагсаалтад орох | Видео карт дээрх 🕒 товч эсвэл үзэх хуудасны "Дараа үзэх" товчоор нэмнэ. `/playlist/watch-later` хуудсанд жагсаалт харагдана, хасах боломжтой. | `routes/library.js`, `pages/page-playlist.js` |
| 4 | Үзсэн видеоны History жагсаалт | Видео тоглож эхлэхэд History-д бүртгэгдэнэ. 5 секунд тутам хаана хүртэл үзсэнийг хадгална (дахин ороход тэндээсээ үргэлжилнэ, карт дээр улаан зураас гарна). Өдрөөр бүлэглэх, хайх, устгах боломжтой. | `routes/library.js`, `pages/page-history.js` |

**Нэмэлтээр (YouTube шиг):** нэвтрэх/бүртгүүлэх, like/dislike, сэтгэгдэл ба хариулт, subscribe, сувгийн хуудас, Subscriptions feed, Таалагдсан видео, бараан горим, responsive (утсан дээр ажиллана), гарын товчлол.

## Ажиллуулах

Шаардлагатай зүйл: **Node.js 20+** (22 LTS-ийг санал болгоно). `npm install` хийх шаардлагагүй.

```bash
npm start
```

Дараа нь http://localhost:3000 хаягийг нээнэ.

| Үйлдэл | Команд |
|--------|--------|
| Сервер асаах | `npm start` |
| Код өөрчлөгдөхөд автоматаар дахин асаах | `npm run dev` |
| API тест (9 тест) | `npm test` |
| Өгөгдлийг анхны байдалд нь буцаах | `npm run seed` |
| Видеонуудыг дахин үүсгэх (ffmpeg хэрэгтэй) | `npm run seed -- --force` |
| Өөрийн видео нэмэх (ffmpeg хэрэгтэй) | `npm run add-video -- миний.mp4 --title "Гарчиг" --channel demo` |

**Туршилтын бүртгэл:** `demo` / `demo1234`. Сувгууд `kodacademy`, `baigal`, `togloom`, `hugjim`-д ч мөн ижил нууц үг ашиглана.

## Багшид stream-ийг хэрхэн харуулах вэ

1. Видео нээгээд **F12 → Network** tab руу орно.
2. `init.mp4`, `seg_0.m4s`, `seg_1.m4s`… гэсэн жижиг хүсэлтүүд дарааллаар нь ирж байгааг харуулна. Бүтэн видео файл огт татагдахгүй.
3. Видеоны дунд руу гүйлгэвэл тэр байрлалын сегментүүд л татагдана.
4. Player дээрх **ⓘ (Stream статистик)** товчийг дарна. Аль сегмент санах ойд байгаа (🟩), татагдаж байгаа (🟦), татагдаагүй (⬜), нийт видеоны хэдэн хувийг татсан зэрэг харагдана.
5. Видео дотор "сегмент #N" гэсэн бичиг бий тул сегмент солигдох нь нүдээр харагдана.

> **UDP-ийн тухай:** Browser доторх JavaScript шууд UDP холболт нээж чадахгүй. YouTube, Netflix ч HTTP дээр сегментээр (DASH/HLS) stream хийдэг. Энэ төсөл яг тэр аргыг ашигласан.

## Бүтэц (monorepo)

```
uzye/
├─ package.json              ← npm workspaces, dependency 0
├─ packages/
│  ├─ framework/src/         ← Өөрсдийн mini framework
│  │  ├─ signal.js           ← реактив төлөв (signal, effect, computed)
│  │  ├─ html.js             ← html`` template, зөвхөн өөрчлөгдсөн хэсгийг шинэчилнэ
│  │  ├─ component.js        ← Web Component-ийн суурь класс (props, styles, lifecycle)
│  │  ├─ router.js           ← SPA router (History API) + <router-view>
│  │  ├─ resource.js         ← async өгөгдөл (loading / error / data)
│  │  └─ api.js              ← fetch wrapper
│  └─ ui/src/                ← Дахин ашиглагдах web component-ууд
│     ├─ search-box.js       ← <search-box> autocomplete
│     ├─ stream-player.js    ← <stream-player> YouTube маягийн тоглуулагч
│     ├─ segment-streamer.js ← MediaSource сегмент stream хийгч
│     ├─ video-card.js       ← <video-card> (grid / list / compact / playlist)
│     ├─ ui-icon.js, ui-toast.js, base-styles.js, format.js
├─ apps/
│  ├─ server/
│  │  ├─ src/index.js        ← HTTP сервер (Express-гүй)
│  │  ├─ src/lib/            ← router, static (Range, gzip, ETag), JSON store, Trie хайлт
│  │  ├─ src/routes/         ← auth, videos, comments, channels, library
│  │  └─ scripts/            ← seed (ffmpeg видео үүсгэх), add-video, api-test
│  └─ web/                   ← Frontend апп (build алхамгүй, native ES modules + import map)
│     ├─ index.html, main.js, state.js, styles.css
│     ├─ components/         ← app-shell, app-header, side-nav, login-dialog, comment-section
│     └─ pages/              ← home, watch, results, channel, history, playlist, subscriptions, login
├─ data/                     ← JSON өгөгдөл (users, comments, history, watchLater ...)
├─ media/videos/<id>/        ← init.mp4, seg_N.m4s, manifest.json, thumbnail.jpg
└─ tools/make-clean.js       ← тайлбаргүй хувилбар үүсгэх
```

## Mini framework товчхон

```js
import { Component, html, css, signal } from '@uzye/framework';

class LikeButton extends Component {
  static props = { label: { type: String, attribute: true, default: 'Like' } };
  static styles = css`button { color: red; }`;
  count = signal(0);                       // төлөв
  render() {                               // count өөрчлөгдөхөд автоматаар дахин зурагдана
    return html`<button @click=${() => this.count.update(n => n + 1)}>${this.label} ${this.count.value}</button>`;
  }
}
LikeButton.define('like-button');          // <like-button label="Таалагдлаа"></like-button>
```

- **signal**: утга өөрчлөгдөхөд түүнийг уншсан бүх компонент өөрөө шинэчлэгдэнэ.
- **html``**: template-ийг нэг удаа parse хийнэ. Дахин зурахад зөвхөн `${}` хэсгүүд шинэчлэгдэх тул input дээрх фокус, тоглож буй видео алдагдахгүй.
- Бичлэгүүд: `@click=${fn}` (event), `.value=${x}` (property), `?disabled=${bool}`, `attr=${x}`.

## Өгөгдөл (JSON)

Сервер асахад `data/*.json` файлуудыг санах ойд уншина. Өөрчлөлт гарахад файлыг дахин бичнэ: эхлээд түр файлд бичээд нэрийг нь солих тул файл эвдрэхгүй. Нууц үгийг `scrypt` hash, session token-ийг SHA-256 hash хэлбэрээр хадгална.

| Файл | Агуулга |
|------|---------|
| `videos.json` | Видеоны каталог |
| `users.json` | Хэрэглэгч / суваг |
| `history.json` | Үзсэн түүх: `{ userId, videoId, position, watchedAt }` |
| `watchLater.json` | Дараа үзэх: `{ userId, videoId, addedAt }` |
| `comments.json`, `reactions.json`, `subscriptions.json`, `commentLikes.json`, `views.json`, `sessions.json` | бусад |

## API

| Method | Зам | Тайлбар |
|--------|-----|---------|
| GET | `/api/suggest?q=` | Autocomplete |
| GET | `/api/search?q=` | Хайлт |
| GET | `/api/videos?category=` | Видеоны жагсаалт |
| GET | `/api/videos/:id` | Дэлгэрэнгүй |
| GET | `/api/videos/:id/manifest` | Stream manifest (сегментүүд) |
| GET | `/api/videos/:id/related` | Санал болгох видео |
| POST | `/api/videos/:id/view` | Үзэлт +1 |
| POST | `/api/videos/:id/reaction` | Like / dislike `{ value: 1 / -1 / 0 }` |
| GET/POST | `/api/videos/:id/comments` | Сэтгэгдэл |
| POST / DELETE | `/api/comments/:id/like`, `/api/comments/:id` | Сэтгэгдлийн like / устгах |
| GET | `/api/channels/:key` | Суваг |
| POST / DELETE | `/api/channels/:key/subscribe` | Захиалах / цуцлах |
| GET / POST / DELETE | `/api/watch-later` | Дараа үзэх |
| GET / POST / DELETE | `/api/history` | Үзсэн түүх |
| GET | `/api/liked`, `/api/subscriptions` | Таалагдсан, захиалгын feed |
| POST / GET | `/api/auth/register`, `login`, `logout`, `me` | Нэвтрэлт |

## Гарын товчлол (видео үзэх үед)

| Товч | Үйлдэл |
|------|--------|
| `Space` / `K` | Тоглуулах / зогсоох |
| `J` / `L` | −10с / +10с |
| `←` / `→` | −5с / +5с |
| `M` | Дуу хаах |
| `F` | Бүтэн дэлгэц |
| `0`–`9` | Видеоны 0%–90% руу үсрэх |
