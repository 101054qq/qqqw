# API contract truth 的重要性與實作方式

建議前置閱讀：

- [00\_專案迭代講義.md](/root/00_nsPrj/01_backEnd/06_elysia/00_demo01/00_teaching/00_專案迭代講義.md:1)
- [01\_版本閱讀指南.md](/root/00_nsPrj/01_backEnd/06_elysia/00_demo01/00_teaching/01_版本閱讀指南.md:1)

這份講義要處理的問題是：

在這個專案裡，我們已經有一個很重要的 single source of truth，也就是 `shared/contracts.ts`。  
它負責讓前後端共享資料模型，例如：

- `MenuItem`
- `Order`
- `User`

但這還不夠。

因為真實系統除了要定義「資料物件長什麼樣」，還要定義：

- API 路徑是什麼
- 用 `GET`、`POST`、`PATCH` 還是 `DELETE`
- `params` 長什麼樣
- `query` 長什麼樣
- `body` 長什麼樣
- `response` 長什麼樣
- 哪些 status code 合法

這一層，就是 `API contract`。

因此，這份文件的核心主張是：

`在進入 Drizzle + Neon 的資料庫重構之前，應先把 API contract truth 的基礎框架補起來。`

---

## 1. 先說結論

對這個專案來說，最合理的順序不是：

- 先大改資料庫
- 之後才慢慢補 API contract

而是：

1. 先把 Elysia route schema 補齊
2. 讓 route schema 成為 API contract truth
3. 之後再輸出成 OpenAPI / Swagger 文件
4. 再進入 `Drizzle + Neon` 重構
5. 最後再接 `Better Auth`

原因很簡單：

`API contract truth` 不是額外加分項，而是後續重構時的護欄。

---

## 2. 為什麼這一步要先做

目前這個專案雖然已經有：

- `shared/contracts.ts`
- Elysia route
- 前後端分離

但在 API contract 這一層，仍然不夠完整。

原因是目前很多 route 只做到：

- 有路徑
- 有部分 `body` 或 `query` 驗證

但還沒有把整個 API contract 系統化成：

- `params`
- `query`
- `body`
- `response`
- 錯誤回應

都可被明確驗證與推導的狀態。

這會造成幾個問題：

### 問題一：前後端對 API 的理解容易靠默契維持

只靠人腦記住：

- `/api/orders/current` 要不要帶 query
- `/api/orders/:id` response 到底長怎樣
- 錯誤時回傳什麼格式

這在版本少時還能撐，但一旦開始重構資料層，就會很容易出錯。

### 問題二：重構資料來源時，API 形狀容易偷偷改掉

當把底層從：

- `JsonFileStore`

改成：

- `Drizzle + PostgreSQL`

如果 route 沒有完整 schema，常見狀況就是：

- 某個欄位名稱被改了
- 某個欄位型別變了
- 某個錯誤回應不一致

結果是資料庫雖然換成功了，但 API contract 卻變得不穩定。

### 問題三：Swagger 若太晚加，會變成事後補文件

若等到整輪重構快結束，才補 OpenAPI / Swagger，往往會變成：

- 先寫 API
- 再補文件

這樣 Swagger 就只是展示頁，而不是 contract 的自然輸出。

---

## 3. `shared/contracts.ts` 和 API contract truth 差在哪裡

這兩者很像，但不能混為一談。

### `shared/contracts.ts`

負責的是：

- 領域資料模型
- 前後端共享型別

例如：

- `MenuItem`
- `Order`
- `OrderResponse`

它回答的是：

`這個資料物件長什麼樣。`

### API contract truth

負責的是：

- HTTP 介面規格
- request / response 規格
- route 輸入輸出約束

它回答的是：

- 哪一條 API 存在
- 要怎麼呼叫
- 允許哪些輸入
- 會回哪些輸出

它回答的是：

`這個 API 要怎麼被正確地使用。`

所以，兩者的關係不是互相取代，而是：

- `shared/contracts.ts` 是資料模型 truth
- `Elysia route schema` 是 API contract truth

---

## 3-1. 實例：`SessionUser` 重構展示的三層效益

這一節用一個具體的程式碼決策，說明 `shared/contracts.ts` 作為 single source of truth 能帶來哪些真實的設計效益。

### 背景

在前端 `App.tsx` 的早期版本裡，接 login API 回應的型別是：

```ts
type SafeUser = Omit<User, "password">;
```

這是一個在前端本地定義的 type alias，語意是「去掉 password 欄位的 User」。

後來在重構時，把它換成直接 import `shared/contracts.ts` 裡已有的 `SessionUser`：

```ts
import type { SessionUser } from "../../shared/contracts.ts";
```

同時移除了兩個輔助函式：

- `normalizeUserId()`：處理舊格式 userId 是 number 的相容邏輯
- `parseStoredSessionUser()`：從 localStorage 還原時修正舊資料格式的包裝函式

最終的 localStorage 還原邏輯，簡化為一段 inline shape validation：

```ts
const parsed = JSON.parse(savedUser) as SessionUser;
if (
  typeof parsed?.id === "string" &&
  parsed.id.trim() !== "" &&
  typeof parsed?.email === "string" &&
  typeof parsed?.name === "string"
) {
  setUser(parsed);
} else {
  window.localStorage.removeItem(USER_STORAGE_KEY);
}
```

### 效益一：型別語意精確，名字即文件

`SafeUser = Omit<User, "password">` 描述的是「User 去掉某個欄位」，這是一種**結構性描述**，讀者要自己推算它的業務意義。

`SessionUser` 描述的是「可以安全暴露給前端的使用者身份」，這是一種**語意描述**，不需要任何額外說明就能理解這個型別的邊界在哪裡。

對讀程式碼的人來說，型別名稱本身就是文件。

### 效益二：合約一致，整條資料流只有一個型別

重構後，login 這條資料流從頭到尾只有一個型別：

| 位置                       | 型別                           |
| -------------------------- | ------------------------------ |
| 後端 `Auth.login()` 回傳   | `SessionUser`                  |
| 後端 login route 回傳      | `ApiDataResponse<SessionUser>` |
| 前端 `handleLogin` 接收    | `ApiDataResponse<SessionUser>` |
| 前端 `user` state          | `SessionUser \| null`          |
| 前端 localStorage 還原驗證 | `SessionUser` 形狀             |

不需要在 `SafeUser` / `SessionUser` 之間心算「這兩個到底是不是同一件事」。

這正是 `shared/contracts.ts` 的核心效益：**型別只定義一次，前後端各自 import，不需要各自維護一份語意相近但名稱不同的型別。**

### 效益三：防禦性程式碼量剛好

移除 `normalizeUserId` 和 `parseStoredSessionUser` 之後，剩下的邊界驗證是：

- JSON.parse 的例外處理
- 三個欄位都是非空 string 的 shape check

這些是**真正的邊界防禦**，對應的是「localStorage 資料可能損毀」這個真實風險。

被移除的部分，對應的是「舊版 userId 是 number」這個**已不存在的歷史狀況**。

當資料格式已全面統一（`data/store.json` 的 userId 全面改為字串），再維護這些相容性程式碼，就只是在增加閱讀負擔，而不是在管理真正的複雜度。

### 小結

這個案例說明了 `shared/contracts.ts` 作為 single source of truth 的效益，不只是「少寫幾行」，而是：

- 前後端對同一件事的描述語言一致了
- 程式碼的複雜度跟著業務的實際複雜度走
- 防禦性程式碼只保留對應真實邊界的部分

這也解釋了為什麼建立清晰的 contract truth，是後續每一輪重構的起點。

---

## 3-2. 策略：需求改變時，資料也要果斷跟著改

這一節補充一個重要策略，它是 3-1 節案例背後能成立的前提。

### 問題：只改 contracts.ts 和 API，不改資料

常見的情況是：

- 需求改變了（例如 userId 從 number 改為 string）
- `shared/contracts.ts` 的型別更新了
- API 的處理邏輯也更新了
- **但 `data/store.json` 裡的舊格式資料沒有動**

這時，為了讓系統繼續運作，就必須在讀取層加入相容性邏輯：

```ts
// 例如這類「修正舊格式」的程式碼
function normalizeUserId(raw: unknown): string {
  if (typeof raw === "number") return String(raw);
  if (typeof raw === "string") return raw;
  return "";
}
```

這段程式碼的存在，代表系統裡有兩個「真相」同時活著：

- contracts.ts 說 id 是 `string`
- 但資料裡有些 id 還是 `number`

相容層的作用，就是在這兩個真相之間做翻譯。

### 後果：相容層累積為技術債

一旦相容層被加入，它就很難被移除。因為：

- 「不確定還有沒有舊格式資料」
- 「移除的話萬一壞了怎麼辦」
- 「先留著，以後再說」

結果往往是這些相容性程式碼越疊越多，最終形成一層隱性的複雜度：

- 閱讀程式碼時需要同時理解「現在的格式」和「過去的格式」
- 新成員很難判斷哪些程式碼還有必要
- 之後真正要重構時，需要先花大量力氣辨認哪些是真正的邊界防禦、哪些是歷史相容

### 正確做法：需求改變時，三層同步更新

正確的策略是：需求一旦改變，應該把三個層次**一起更新**：

| 層次               | 說明           | 範例                               |
| ------------------ | -------------- | ---------------------------------- |
| **contracts.ts**   | 型別定義       | `id: string`                       |
| **API / 程式邏輯** | 讀寫與驗證邏輯 | 不再 `Number(id)` 轉型             |
| **資料本身**       | 實際儲存的內容 | `data/store.json` 的 id 全改為字串 |

三層同步的結果，是系統裡只有一個真相。不需要相容層，因為沒有舊格式存在。

### 為什麼這樣做反而成本更低

直覺上，「修正資料」感覺是額外的工作。但實際上：

- **一次性修正資料**的成本，遠低於**長期維護相容層**的累積成本
- 相容層的存在，會讓每一個後續開發者都要多付出理解它的認知成本
- 資料格式不一致，會讓之後每一次重構的範圍都比預期更大

以本專案為例：

- 一次性把 `data/store.json` 的 userId 全部改為字串：**幾分鐘**
- 長期維護 `normalizeUserId` + `parseStoredSessionUser`：**每次閱讀都要多理解，每次重構都要多考慮**

這正是「果斷修正資料」在工程管理上的核心價值：

> 讓系統的複雜度，真實反映業務的實際複雜度，而不是歷史遺留的偶然複雜度。

### 何時應該保留相容層

相容層有其存在的正當性，但條件是：

- **外部資料來源無法控制**（例如第三方 API 回傳格式不固定）
- **資料量太大、遷移成本確實高**（需要評估後再決定）
- **多個系統共用同一份資料**，無法單獨修改格式

如果資料在自己的掌控範圍內，格式由自己決定，那麼相容層幾乎都是可以透過「一次性修正資料」來消除的。

---

## 4. 為什麼 Elysia route schema 最適合當 API contract truth

在 Elysia 裡，最自然的做法不是另外維護一份獨立 contract 文件，而是：

`直接把 route schema 當成 API contract 的實作來源。`

也就是在 route 上定義：

- `params`
- `query`
- `body`
- `headers`
- `response`

這樣的好處是：

### 好處一：同一份定義同時服務三件事

1. runtime validation
2. TypeScript type inference
3. OpenAPI schema generation

這正是降低心智負荷最重要的地方：

`不要維護三份不同但看起來很像的規格。`

### 好處二：它比手寫 Swagger 更接近真實執行行為

因為 route schema 不是展示文件，而是實際參與執行的規則。

也就是說，它不是「寫給人看」而已，而是：

- request 進來時會被驗證
- response 形狀可以被限制
- 型別可以直接推導給前端或測試程式

### 好處三：對重構最友善

之後若改用：

- store
- ORM
- database
- auth

都可以盡量不動 contract，或至少知道自己動到了哪裡。

---

## 5. 文件層和實作層應如何分工

這一點非常重要。

### 文件層

文件層適合使用：

- OpenAPI
- Swagger UI

它的角色是：

- 給人閱讀
- 給測試與整合工具使用
- 給前端或第三方快速理解 API

### 實作層

實作層真正的 contract source 應該是：

- Elysia route schema

也就是說：

- Swagger 是 contract 的輸出
- route schema 才是 contract 的來源

這樣的分工才不會讓文件與實作逐漸分離。

---

## 6. 這個專案現階段最低成本的落地做法

如果以降低心智負荷為目標，這個階段不需要一次把所有工具都導入。

最務實的做法是：

### 第一步：先把 route schema 補齊

至少讓每一條主要 API 都明確定義：

- `params`
- `query`
- `body`
- `response`

這一步做完，其實就已經建立了 80% 的 API contract truth 基礎。

### 第二步：讓錯誤回應格式也一致

例如：

- `404`
- `400`
- `401`
- `403`
- `409`

都盡量回到一致的 `ApiErrorResponse`

這樣前端與測試程式更容易處理。

### 第三步：之後再接 OpenAPI / Swagger

等 route schema 足夠完整後，再把它輸出成文件。

這樣 Swagger 才會是「從 contract 生成」，而不是一份補寫的說明頁。

---

## 7. 為什麼這一步要排在 Drizzle + Neon 之前

這是這份講義最重要的結論。

因為接下來資料庫重構會改動很多東西：

- 查詢邏輯
- repository / store 實作
- 資料來源
- 部分欄位型別
- 錯誤處理

如果在這之前沒有先把 API contract 穩住，就很容易出現：

- 底層換掉了
- 前端也壞了
- 但到底是資料庫問題、ORM 問題，還是 API shape 問題，不容易分清楚

換句話說：

`API contract truth 先補起來，能把後面的重構邊界切得更清楚。`

它讓知道：

- 哪些變更只是資料層重構
- 哪些變更真的改到了 API 契約

這正是穩定成長的關鍵。

---

## 8. 這一步最適合怎麼教

如果要拿來上課，這一版很適合強調：

### 第一個重點

共享資料型別不等於完整 API 契約。

`shared/contracts.ts` 很重要，但它只解決了「物件長什麼樣」，還沒完整解決「API 怎麼互動」。

### 第二個重點

contract 最好要能同時服務：

- 文件
- 驗證
- 型別推導

而不是三套各寫各的。

### 第三個重點

真正降低心智負荷，不是少寫東西，而是減少重複維護。

route schema 的價值就在這裡。

---

## 9. 建議的實作順序

若依目前新的教學主線，最建議的順序是：

1. 先把 Elysia route schema 補齊
2. 讓 route schema 成為 API contract truth
3. 再導入 OpenAPI / Swagger 輸出
4. 再做 `Drizzle + Neon` 資料庫升級
5. 最後再做 `Better Auth + Google provider`

這樣的順序有一個很大的好處：

- 每一步都在降低下一步的混亂度

而不是：

- 每一步都把新的複雜度疊上去

---

## 10. 一句話總結

在這個專案裡，`shared/contracts.ts` 解決的是資料模型一致性；而在進入 `Drizzle + Neon` 之前，還要先補上另一個 single source of truth，也就是：

`以 Elysia route schema 為核心的 API contract truth。`

下一份建議接著閱讀：

- [02_1_從目前 backend.ts 補齊 Elysia route schema 的實作步驟清單.md](/root/00*nsPrj/01_backEnd/06_elysia/00_demo01/00_teaching/02_1*從目前 backend.ts 補齊 Elysia route schema 的實作步驟清單.md:1)
