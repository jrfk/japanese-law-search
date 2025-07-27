# Japanese Law Search System

日本の法律文書を自然言語で検索・質問できるシステムです。モノレポ構成でフロントエンドとバックエンドを統合管理しています。

## 🏗️ アーキテクチャ

### モノレポ構成
```
japanese-law-search/
├── apps/
│   ├── backend/           # Express.js API サーバー
│   └── frontend/          # Next.js Webアプリケーション
├── packages/              # 共通ライブラリ (将来用)
└── package.json           # ワークスペース設定
```

### 技術スタック

**バックエンド (apps/backend)**
- Express.js + TypeScript
- 複数AIプロバイダー対応 (OpenAI, Google Vertex AI, Gemini)
- ChromaDB (ベクトルデータベース)
- 自然言語処理・文書検索

**フロントエンド (apps/frontend)**
- Next.js 15 + TypeScript
- shadcn/ui + TailwindCSS
- Zustand (状態管理)
- v0ベースのモダンUI

## 🚀 クイックスタート

### 1. 依存関係のインストール
```bash
npm install
```

### 2. 環境設定
```bash
# .env ファイルを作成 (apps/backend/.env)
cp apps/backend/.env.example apps/backend/.env
```

### 3. 開発サーバー起動
```bash
# 両方のアプリを同時起動
npm run dev

# 個別起動も可能
npm run dev:backend    # バックエンドのみ (http://localhost:3000)
npm run dev:frontend   # フロントエンドのみ (http://localhost:3001)
```

## 📋 利用可能なスクリプト

### 🔧 開発
```bash
npm run dev              # 両方のアプリを同時起動
npm run dev:backend      # バックエンドのみ起動
npm run dev:frontend     # フロントエンドのみ起動
```

### 🏗️ ビルド
```bash
npm run build            # 両方をビルド
npm run build:backend    # バックエンドのみビルド
npm run build:frontend   # フロントエンドのみビルド
```

### 🧪 テスト・品質チェック
```bash
npm run test             # テスト実行
npm run lint             # 全体のリント
npm run typecheck        # 型チェック
```

### 📚 文書インデックス
```bash
npm run index:documents         # 文書のインデックス作成
npm run index:documents:vertex  # Vertex AI版
```

## 🎯 主要機能

### 検索機能
- **自然言語検索**: 「憲法第9条について教えて」
- **カテゴリフィルタ**: 憲法、民法、刑法、商法、民事訴訟法
- **時代フィルタ**: 明治、大正、昭和、平成、令和
- **関連度スコア**: 検索結果の関連度表示

### UI/UX
- **会話型インターフェース**: ChatGPT風の対話
- **参照文書表示**: ソース文書と抜粋を表示
- **関連質問**: 自動生成される関連質問
- **会話履歴**: 過去の検索履歴を管理
- **レスポンシブデザイン**: モバイル対応

### AI統合
- **マルチプロバイダー**: OpenAI, Vertex AI, Gemini
- **ベクトル検索**: セマンティック検索
- **コスト管理**: API使用量の追跡

## 🗂️ 主要ディレクトリ

### バックエンド (apps/backend/)
```
src/
├── controllers/       # API コントローラー
├── services/         # ビジネスロジック
│   ├── ai-service-factory.ts
│   ├── llm-service.ts
│   └── vector-store.ts
├── types/            # 型定義
└── utils/            # ユーティリティ
```

### フロントエンド (apps/frontend/)
```
src/
├── app/              # Next.js App Router
├── components/
│   ├── ui/          # shadcn/ui コンポーネント
│   └── chat/        # チャット関連コンポーネント
├── lib/             # API クライアント
├── store/           # Zustand ストア
└── hooks/           # カスタムフック
```

## 🔧 設定ファイル

- `package.json` - ワークスペース設定とルートスクリプト
- `apps/backend/.env` - バックエンド環境変数
- `apps/frontend/next.config.mjs` - Next.js設定
- `apps/backend/docker-compose.yml` - ChromaDB設定

## 📖 開発ガイド

### 新しい機能の追加
1. バックエンドAPI: `apps/backend/src/controllers/`
2. フロントエンドコンポーネント: `apps/frontend/src/components/`
3. 型定義: 各アプリの `types/` ディレクトリ

### デバッグ
- バックエンドログ: `npm run dev:backend`
- フロントエンド: Next.js開発者ツール
- API テスト: `http://localhost:3000/health`

## 🤝 コントリビューション

1. このリポジトリをフォーク
2. 機能ブランチを作成 (`git checkout -b feature/amazing-feature`)
3. 変更をコミット (`git commit -m 'Add amazing feature'`)
4. ブランチにプッシュ (`git push origin feature/amazing-feature`)
5. プルリクエストを作成

## 📄 ライセンス

MIT License - 詳細は [LICENSE](LICENSE) ファイルを参照