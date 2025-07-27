# Japanese Law Search Frontend

v0のデザインを参考にしたモダンなNext.js + shadcn/uiベースのフロントエンドです。

## 技術スタック

- **Next.js 15** - React フレームワーク
- **TypeScript** - 型安全性
- **Tailwind CSS** - スタイリング
- **shadcn/ui** - UIコンポーネント
- **Zustand** - 状態管理
- **Lucide React** - アイコン

## 開発環境のセットアップ

```bash
# 依存関係のインストール
npm install

# 開発サーバーの起動 (フロントエンド: http://localhost:3001)
npm run dev

# TypeScript型チェック  
npm run type-check

# ビルド
npm run build
```

## 機能

### 実装済み
- ✅ モダンなサイドバー付きUI (v0デザインベース)
- ✅ 会話型チャットインターface
- ✅ 検索フィルタ (カテゴリ、時代)
- ✅ メッセージ表示とソース表示
- ✅ 関連質問表示機能
- ✅ ローディング状態管理
- ✅ レスポンシブデザイン
- ✅ 日本語フォント対応

### API統合
- `/api/search` - 検索API (バックエンドへのプロキシ)
- `/api/conversations/:id` - 会話履歴取得
- `/health` - ヘルスチェック

## ディレクトリ構造

```
src/
├── app/                    # Next.js App Router
│   ├── globals.css        # グローバルスタイル
│   ├── layout.tsx         # ルートレイアウト  
│   └── page.tsx           # メインページ
├── components/
│   ├── ui/                # shadcn/ui基本コンポーネント
│   ├── chat/              # チャット関連コンポーネント
│   ├── app-sidebar.tsx    # アプリケーションサイドバー
│   └── site-header.tsx    # ヘッダー
├── lib/
│   ├── api.ts            # APIクライアント
│   ├── types.ts          # 型定義
│   └── utils.ts          # ユーティリティ関数
└── store/
    └── chat-store.ts     # チャット状態管理
```

## バックエンドとの連携

フロントエンドは `http://localhost:3000` で稼働するバックエンドAPIと連携します。

### 起動手順
1. バックエンドサーバーを先に起動: `npm run dev` (ルートディレクトリ)
2. フロントエンドサーバーを起動: `npm run dev` (frontendディレクトリ)

バックエンドAPIへのプロキシは `next.config.mjs` で設定済みです。