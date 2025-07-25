# Japanese Law Search System

日本の法律文書に対する自然言語検索システムです。NotebookLMやDeepWikiのように、マークダウン形式の法律文書に対して自然言語で質問し、会話形式で回答を得ることができます。

## 🌟 機能

- **自然言語検索**: 日本語・英語での自然な質問が可能
- **セマンティック検索**: OpenAI/Vertex AI Embeddingsを使用した意味的な文書検索
- **マルチプロバイダー対応**: OpenAI ⇄ Google Vertex AI 自動フォールバック
- **会話形式の対話**: 継続的な対話で深い理解が可能
- **多様なフィルタリング**: カテゴリ、時代、法律番号での絞り込み
- **ソース表示**: 回答の根拠となる文書の明示
- **関連質問提案**: より深い理解のための関連質問を自動提案

## 🏗️ アーキテクチャ

### 主要コンポーネント

1. **Document Parser**: マークダウンファイルの解析とメタデータ抽出
2. **Vector Search Engine**: OpenAI/Vertex AI Embeddings + ChromaDBによるベクトル検索
3. **Multi-Provider AI Services**: OpenAI/Vertex AI対応のLLM・エンベディングサービス
4. **Query Processor**: 検索と応答生成のオーケストレーション
5. **REST API**: フロントエンドとの連携用API
6. **Web UI**: ユーザーフレンドリーなチャットインターフェース

### 技術スタック

- **Backend**: Node.js, TypeScript, Express
- **Vector Database**: ChromaDB
- **AI Providers**: 
  - OpenAI GPT-3.5/4, text-embedding-3-small
  - Google Vertex AI Gemini Pro/Flash, text-embedding-004
- **Frontend**: Vanilla JavaScript, CSS3
- **Testing**: Jest
- **Linting**: ESLint

## 📦 セットアップ

### 前提条件

- Node.js (v18以上)
- ChromaDB サーバー
- **AI Provider (以下のいずれか)**:
  - OpenAI API キー
  - Google Cloud Project (Vertex AI API有効化済み)

### インストール

1. リポジトリをクローン:
```bash
git clone https://github.com/your-repo/japanese-law-search.git
cd japanese-law-search
```

2. 依存関係をインストール:
```bash
npm install
```

3. 環境変数を設定:
```bash
cp .env.example .env
```

`.env`ファイルを編集して以下を設定:

#### Option 1: OpenAI使用の場合
```env
# AI Provider Configuration
AI_PROVIDER_PRIMARY=openai
AI_PROVIDER_FALLBACK=vertexai

# OpenAI Configuration
OPENAI_API_KEY=your_openai_api_key_here
OPENAI_MODEL=gpt-3.5-turbo
OPENAI_EMBEDDING_MODEL=text-embedding-3-small

# Vertex AI Configuration (Optional - フォールバック用)
VERTEX_AI_PROJECT_ID=your-gcp-project-id
VERTEX_AI_LOCATION=asia-northeast1

# Other Settings
CHROMA_HOST=localhost
CHROMA_PORT=8000
PORT=3000
DOCUMENTS_PATH=./markdown
```

#### Option 2: Vertex AI使用の場合
```env
# AI Provider Configuration
AI_PROVIDER_PRIMARY=vertexai
AI_PROVIDER_FALLBACK=openai

# Vertex AI Configuration
VERTEX_AI_PROJECT_ID=your-gcp-project-id
VERTEX_AI_LOCATION=asia-northeast1
VERTEX_AI_TEXT_MODEL=gemini-1.5-pro
VERTEX_AI_EMBEDDING_MODEL=text-embedding-004
# VERTEX_AI_KEY_FILENAME=/path/to/service-account-key.json  # Optional

# OpenAI Configuration (Optional - フォールバック用)
OPENAI_API_KEY=your_openai_api_key_here

# Other Settings  
CHROMA_HOST=localhost
CHROMA_PORT=8000
PORT=3000
DOCUMENTS_PATH=./markdown
```

4. ChromaDBを起動:
```bash
# Docker Compose使用の場合 (推奨)
docker-compose up -d

# またはDocker直接使用
docker run -p 8000:8000 chromadb/chroma

# またはPythonで直接インストール
pip install chromadb
chroma run --host 0.0.0.0 --port 8000
```

### ビルドと起動

1. プロジェクトをビルド:
```bash
npm run build
```

2. ドキュメントを索引化:
```bash
# 自動プロバイダー選択でインデックス化
npm run index:documents

# Vertex AI直接指定でインデックス化
npm run index:documents:vertex
```

3. サーバーを起動:
```bash
npm start
```

または開発モードで:
```bash
npm run dev
```

## 🚀 使用方法

### Web UI

1. ブラウザで `http://localhost:3000` にアクセス
2. 検索ボックスに自然言語で質問を入力
3. 必要に応じてフィルタを設定
4. 送信ボタンをクリックまたはEnterキーで検索

#### 質問例:
- 「憲法第9条について教えて」
- 「民法の契約に関する条文は？」
- 「刑法における窃盗罪の定義は何ですか？」
- 「What is Article 9 of the Japanese Constitution?」

### API エンドポイント

#### POST /api/search
自然言語検索を実行:

```json
{
  "query": "憲法第9条について教えて",
  "conversationId": "optional-conversation-id",
  "language": "ja",
  "filters": {
    "category": "321",
    "era": "昭和"
  }
}
```

#### GET /api/documents/search
ドキュメント検索:
```
GET /api/documents/search?q=憲法&limit=10&category=321
```

#### GET /api/conversations/:conversationId
会話履歴を取得:
```
GET /api/conversations/conversation-id
```

## 📁 プロジェクト構造

```
src/
├── types/              # TypeScript型定義
│   ├── document.ts     # ドキュメント関連の型
│   ├── vector.ts       # ベクトル検索関連の型
│   ├── vertex-ai.ts    # Vertex AI関連の型
│   └── index.ts        # 型のエクスポート
├── services/           # コアサービス
│   ├── document-parser.ts       # ドキュメント解析
│   ├── embedding-service.ts     # OpenAI埋め込み生成
│   ├── vertex-ai-embedding.ts   # Vertex AI埋め込み生成
│   ├── llm-service.ts           # OpenAI LLM統合
│   ├── vertex-ai-llm.ts         # Vertex AI LLM統合
│   ├── provider-factory.ts      # マルチプロバイダー管理
│   ├── ai-service-factory.ts    # AIサービス統合管理
│   ├── vector-store.ts          # ベクトル検索
│   └── query-processor.ts       # クエリ処理
├── controllers/        # APIコントローラー
│   └── search-controller.ts
├── utils/              # ユーティリティ
│   └── document-indexer.ts      # 文書索引化
├── scripts/            # CLIスクリプト
│   ├── index-documents.ts       # 自動プロバイダー選択
│   └── index-documents-vertex.ts # Vertex AI直接指定
├── __tests__/          # テストファイル
│   ├── document-parser.test.ts
│   └── vertex-ai-integration.test.ts
├── app.ts              # Expressアプリケーション
└── index.ts            # エントリーポイント

public/
├── index.html          # メインHTML
├── css/
│   └── style.css       # スタイルシート
└── js/
    └── app.js          # フロントエンドJavaScript
```

## 🔧 開発

### テスト実行
```bash
npm test
```

### リンター実行
```bash
npm run lint
```

### 型チェック
```bash
npm run typecheck
```

### 新しいドキュメントの追加

1. `markdown/` ディレクトリにMarkdownファイルを配置
2. ファイル名は以下の形式を推奨: `{法律番号}_{日付}_{その他}.md`
3. 再索引化を実行:
```bash
npm run index:documents
```

## 📝 設定

### AIプロバイダー設定

#### プロバイダー選択
- **プライマリプロバイダー**: `AI_PROVIDER_PRIMARY=openai|vertexai`
- **フォールバックプロバイダー**: `AI_PROVIDER_FALLBACK=vertexai,openai`

#### コスト最適化
- **コスト最適化**: `COST_OPTIMIZATION_ENABLED=true`
- **月次予算制限**: `MONTHLY_BUDGET_LIMIT=100` (USD)

#### ヘルスチェック
- **ヘルスチェック間隔**: `HEALTH_CHECK_INTERVAL=300000` (5分)
- **タイムアウト時間**: `HEALTH_CHECK_TIMEOUT=10000` (10秒)

### ドキュメント解析

- **チャンクサイズ**: `CHUNK_SIZE=1000` (デフォルト)
- **チャンク重複**: `CHUNK_OVERLAP=200` (デフォルト)

### 検索設定

- **最大検索結果数**: `MAX_SEARCH_RESULTS=10`
- **類似度閾値**: `SIMILARITY_THRESHOLD=0.7`

## 🌐 Vertex AI セットアップ

### Google Cloud 設定

1. **Google Cloud Projectを作成**:
```bash
gcloud projects create your-project-id
gcloud config set project your-project-id
```

2. **Vertex AI APIを有効化**:
```bash
gcloud services enable aiplatform.googleapis.com
```

3. **認証設定**:

#### Option 1: Application Default Credentials (ADC)
```bash
gcloud auth application-default login
```

#### Option 2: Service Account Key
```bash
# サービスアカウント作成
gcloud iam service-accounts create vertex-ai-service

# 権限付与
gcloud projects add-iam-policy-binding your-project-id \
    --member="serviceAccount:vertex-ai-service@your-project-id.iam.gserviceaccount.com" \
    --role="roles/aiplatform.user"

# キーファイル生成
gcloud iam service-accounts keys create vertex-ai-key.json \
    --iam-account=vertex-ai-service@your-project-id.iam.gserviceaccount.com

# 環境変数に設定
export VERTEX_AI_KEY_FILENAME=/path/to/vertex-ai-key.json
```

### 地域最適化

日本国内でのアクセスには以下の地域を推奨:
- **asia-northeast1** (東京): 低レイテンシ
- **asia-northeast3** (ソウル): バックアップ地域

## 🤝 コントリビューション

1. フォークしてブランチを作成
2. 変更を実装
3. テストを追加・実行
4. プルリクエストを作成

## 📄 ライセンス

MIT License

## 🙏 謝辞

このプロジェクトは以下の技術・サービスを使用しています:
- OpenAI GPT & Embeddings
- Google Vertex AI (Gemini Pro/Flash, text-embedding-004)
- ChromaDB
- Express.js
- TypeScript
- Docker