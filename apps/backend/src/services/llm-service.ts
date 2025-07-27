import OpenAI from 'openai';
import { SearchResult, SourceCitation, Conversation, ConversationMessage } from '../types';

export interface LLMProvider {
  generateResponse(prompt: string, context: SearchResult[], conversation?: ConversationMessage[]): Promise<string>;
  generateRelatedQuestions(query: string, context: SearchResult[]): Promise<string[]>;
}

export class OpenAILLMService implements LLMProvider {
  private client: OpenAI;
  private model: string;

  constructor(apiKey: string, model: string = 'gpt-3.5-turbo') {
    this.client = new OpenAI({ apiKey });
    this.model = model;
  }

  async generateResponse(
    prompt: string, 
    context: SearchResult[], 
    conversation?: ConversationMessage[]
  ): Promise<string> {
    const systemPrompt = this.buildSystemPrompt();
    const contextPrompt = this.buildContextPrompt(context);
    const conversationHistory = this.buildConversationHistory(conversation || []);
    
    const messages: OpenAI.ChatCompletionMessageParam[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `${contextPrompt}\n\n${conversationHistory}\n\nユーザーの質問: ${prompt}` }
    ];

    try {
      const response = await this.client.chat.completions.create({
        model: this.model,
        messages,
        temperature: 0.3,
        max_tokens: 2000,
      });

      return response.choices[0]?.message?.content || '申し訳ございませんが、回答を生成できませんでした。';
    } catch (error) {
      throw new Error(`LLM response generation failed: ${error}`);
    }
  }

  async generateRelatedQuestions(query: string, context: SearchResult[]): Promise<string[]> {
    const contextSummary = context
      .slice(0, 3)
      .map(result => result.chunk.content.substring(0, 200))
      .join('\n---\n');

    const prompt = `
以下の文脈と質問に基づいて、関連する質問を3つ生成してください。
質問は日本語で、法律文書の内容に関する具体的で有用なものにしてください。

元の質問: ${query}

文脈:
${contextSummary}

関連質問（3つ）:
1.
2. 
3.
`;

    try {
      const response = await this.client.chat.completions.create({
        model: this.model,
        messages: [
          { role: 'user', content: prompt }
        ],
        temperature: 0.7,
        max_tokens: 300,
      });

      const content = response.choices[0]?.message?.content || '';
      const questions = content
        .split('\n')
        .filter(line => /^\d+\./.test(line.trim()))
        .map(line => line.replace(/^\d+\.\s*/, '').trim())
        .filter(q => q.length > 0);

      return questions.slice(0, 3);
    } catch (error) {
      console.warn('Failed to generate related questions:', error);
      return [];
    }
  }

  private buildSystemPrompt(): string {
    return `
あなたは日本の法律文書に特化したAIアシスタントです。

以下のガイドラインに従って回答してください：

1. **正確性**: 提供された文書の内容に基づいて正確に回答してください
2. **引用**: 回答には必ず適切な引用を含めてください
3. **日本語**: 回答は自然で読みやすい日本語で行ってください
4. **構造化**: 複雑な内容は箇条書きや段落で整理してください
5. **謙虚さ**: 不確実な情報については明確に示してください

回答形式：
- 質問に対する直接的な回答
- 関連する法律条文や規定の説明
- 必要に応じて背景情報や解釈の提供
- 参照した文書の明示

注意事項：
- 法的助言は提供しません
- 文書に記載されていない内容については推測を避けてください
- 複数の解釈がある場合は、それを明示してください
`;
  }

  private buildContextPrompt(context: SearchResult[]): string {
    if (context.length === 0) {
      return '関連する文書が見つかりませんでした。';
    }

    const contextText = context
      .map((result, index) => {
        return `
【文書${index + 1}】${result.chunk.title}
ファイル: ${result.chunk.metadata.fileName}
関連度: ${(result.score * 100).toFixed(1)}%

内容:
${result.chunk.content}
`;
      })
      .join('\n---\n');

    return `
以下の文書を参照して回答してください：

${contextText}
`;
  }

  private buildConversationHistory(conversation: ConversationMessage[]): string {
    if (conversation.length === 0) {
      return '';
    }

    const history = conversation
      .slice(-4)
      .map(msg => {
        const role = msg.role === 'user' ? 'ユーザー' : 'アシスタント';
        return `${role}: ${msg.content}`;
      })
      .join('\n');

    return `
会話履歴:
${history}
`;
  }
}

export class ConversationManager {
  private conversations: Map<string, Conversation> = new Map();

  createConversation(id: string): Conversation {
    const conversation: Conversation = {
      id,
      messages: [],
      createdAt: new Date(),
      lastActivity: new Date()
    };
    
    this.conversations.set(id, conversation);
    return conversation;
  }

  getConversation(id: string): Conversation | undefined {
    return this.conversations.get(id);
  }

  addMessage(conversationId: string, message: ConversationMessage): void {
    const conversation = this.conversations.get(conversationId);
    if (conversation) {
      conversation.messages.push(message);
      conversation.lastActivity = new Date();
    }
  }

  getConversationHistory(conversationId: string, limit: number = 10): ConversationMessage[] {
    const conversation = this.conversations.get(conversationId);
    if (!conversation) return [];
    
    return conversation.messages.slice(-limit);
  }

  createSourceCitations(searchResults: SearchResult[]): SourceCitation[] {
    return searchResults.map(result => ({
      documentPath: result.chunk.documentPath,
      title: result.chunk.title,
      excerpt: result.highlights.join(' ... '),
      score: result.score,
      chunkId: result.chunk.id
    }));
  }
}

export const createLLMService = (apiKey: string, model?: string): LLMProvider => {
  return new OpenAILLMService(apiKey, model);
};

export const conversationManager = new ConversationManager();