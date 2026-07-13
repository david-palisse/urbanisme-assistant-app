'use client';

import { useEffect, useRef, useState } from 'react';
import { ChatMessage } from '@/types';
import { api } from '@/lib/api';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, MessageCircle, Send, Bot, User, AlertTriangle, Clock } from 'lucide-react';

interface AnalysisChatProps {
  projectId: string;
  /** False once the 30-day Q&A window after purchase has expired */
  chatAvailable?: boolean;
  /** End of the Q&A window, displayed while the chat is open */
  chatAccessUntil?: string | null;
}

const SUGGESTED_QUESTIONS = [
  'Pourquoi cette autorisation est-elle nécessaire ?',
  'Quels sont les délais d’instruction de mon dossier ?',
  'Comment réduire les contraintes de mon projet ?',
];

/**
 * Post-analysis conversation with the assistant about the project:
 * questions/réponses affichées en fil de discussion, réponses générées par
 * le LLM avec le contexte du projet et de l'analyse.
 */
export function AnalysisChat({
  projectId,
  chatAvailable = true,
  chatAccessUntil = null,
}: AnalysisChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [pendingQuestion, setPendingQuestion] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const hasInteracted = useRef(false);

  // Load conversation history
  useEffect(() => {
    let cancelled = false;

    const loadHistory = async () => {
      const history = await api.getProjectChat(projectId);
      if (!cancelled) {
        setMessages(history);
        setIsLoading(false);
      }
    };

    loadHistory();
    return () => {
      cancelled = true;
    };
  }, [projectId]);

  // Keep the latest message visible, but only once the user interacted so the
  // page doesn't jump to the chat on load
  useEffect(() => {
    if (hasInteracted.current) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [messages, pendingQuestion]);

  const sendMessage = async (question: string) => {
    const trimmed = question.trim();
    if (!trimmed || isSending) return;

    hasInteracted.current = true;
    setError(null);
    setIsSending(true);
    setPendingQuestion(trimmed);
    setInput('');

    try {
      const { userMessage, assistantMessage } = await api.sendProjectChatMessage(
        projectId,
        trimmed
      );
      setMessages((prev) => [...prev, userMessage, assistantMessage]);
    } catch {
      setError(
        "L'assistant n'a pas pu répondre à votre question. Veuillez réessayer."
      );
      // Restore the question so the user can retry without retyping
      setInput(trimmed);
    } finally {
      setPendingQuestion(null);
      setIsSending(false);
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      sendMessage(input);
    }
  };

  const showEmptyState = !isLoading && messages.length === 0 && !pendingQuestion;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <MessageCircle className="h-5 w-5" />
          Des questions sur votre projet ?
        </CardTitle>
        <CardDescription>
          Posez vos questions à notre assistant virtuel : il connaît votre
          projet, le résultat de l&apos;analyse et les règles d&apos;urbanisme
          applicables à votre parcelle.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Conversation */}
        {isLoading ? (
          <div className="flex justify-center py-6">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          (messages.length > 0 || pendingQuestion) && (
            <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
              {messages.map((message) => (
                <ChatBubble key={message.id} message={message} />
              ))}

              {/* Question being answered */}
              {pendingQuestion && (
                <>
                  <ChatBubble
                    message={{
                      id: 'pending',
                      projectId,
                      role: 'USER',
                      content: pendingQuestion,
                      createdAt: new Date().toISOString(),
                    }}
                  />
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Bot className="h-4 w-4" />
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>L&apos;assistant rédige une réponse...</span>
                  </div>
                </>
              )}

              <div ref={bottomRef} />
            </div>
          )
        )}

        {/* Suggested questions when the conversation is empty */}
        {showEmptyState && chatAvailable && (
          <div className="flex flex-wrap gap-2">
            {SUGGESTED_QUESTIONS.map((question) => (
              <button
                key={question}
                type="button"
                onClick={() => sendMessage(question)}
                className="text-sm px-3 py-1.5 rounded-full border border-input bg-muted hover:bg-accent transition-colors text-left"
              >
                {question}
              </button>
            ))}
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="p-3 rounded-lg border border-red-200 bg-red-50">
            <div className="flex items-center gap-2 text-sm text-red-700">
              <AlertTriangle className="h-4 w-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          </div>
        )}

        {/* Input, or expiry notice once the Q&A window is over */}
        {chatAvailable ? (
          <>
            <div className="flex items-end gap-2">
              <Textarea
                value={input}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Posez votre question sur le projet, l'autorisation, les documents..."
                rows={2}
                className="resize-none"
                disabled={isSending}
              />
              <Button
                onClick={() => sendMessage(input)}
                disabled={!input.trim() || isSending}
                size="icon"
                className="h-10 w-10 flex-shrink-0"
                aria-label="Envoyer la question"
              >
                {isSending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>

            <p className="text-xs text-muted-foreground">
              Réponses fournies à titre indicatif : seule la décision du service
              instructeur de votre mairie fait foi.
              {chatAccessUntil && (
                <>
                  {' '}
                  Questions disponibles jusqu&apos;au{' '}
                  {new Date(chatAccessUntil).toLocaleDateString('fr-FR')}.
                </>
              )}
            </p>
          </>
        ) : (
          <div className="p-3 rounded-lg border border-yellow-200 bg-yellow-50">
            <div className="flex items-center gap-2 text-sm text-yellow-800">
              <Clock className="h-4 w-4 flex-shrink-0" />
              <span>
                Votre période de questions de 30 jours est terminée. L&apos;historique
                de la conversation reste consultable ci-dessus.
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ChatBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === 'USER';

  return (
    <div className={`flex gap-2 ${isUser ? 'justify-end' : 'justify-start'}`}>
      {!isUser && (
        <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-1">
          <Bot className="h-4 w-4 text-primary" />
        </div>
      )}
      <div
        className={`max-w-[85%] rounded-lg px-3 py-2 text-sm whitespace-pre-wrap ${
          isUser
            ? 'bg-primary text-primary-foreground'
            : 'bg-muted text-foreground'
        }`}
      >
        {message.content}
      </div>
      {isUser && (
        <div className="h-7 w-7 rounded-full bg-muted flex items-center justify-center flex-shrink-0 mt-1">
          <User className="h-4 w-4 text-muted-foreground" />
        </div>
      )}
    </div>
  );
}
