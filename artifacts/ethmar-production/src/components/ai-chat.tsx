import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { sendChat } from '@workspace/api-client-react';
import { Dialog, DialogContent, DialogTitle, DialogDescription, DialogClose } from '@/components/ui/dialog';
import { MessageSquareText, Send, X, RotateCcw, Square, Trash2, ShieldCheck } from 'lucide-react';

type Msg = { id: number; role: 'user' | 'assistant'; content: string };

const MAX_MSG = 4000;
const MAX_TOTAL = 20000;
const MAX_COUNT = 20;
const TIMEOUT_MS = 60000;

function selectHistory(all: Msg[]) {
  const out: { role: 'user' | 'assistant'; content: string }[] = [];
  let total = 0;
  for (let i = all.length - 1; i >= 0 && out.length < MAX_COUNT; i--) {
    const content = all[i].content.slice(0, MAX_MSG);
    if (!content.trim()) continue;
    if (total + content.length > MAX_TOTAL) break;
    total += content.length;
    out.unshift({ role: all[i].role, content });
  }
  while (out.length && out[0].role !== 'user') out.shift();
  return out;
}

function friendly(err: unknown, timedOut: boolean): string {
  if (timedOut) return 'استغرق الرد وقتًا أطول من المتوقع. حاول مرة أخرى.';
  const status = typeof err === 'object' && err && 'status' in err ? Number((err as { status: unknown }).status) : 0;
  if (status === 401) return 'انتهت جلسة الدخول. أعد تسجيل الدخول ثم حاول مجددًا.';
  if (status === 429) return 'عدد الطلبات كبير حاليًا. انتظر قليلًا ثم أعد المحاولة.';
  if (status === 503) return 'المساعد غير متاح مؤقتًا. حاول لاحقًا.';
  if (status === 502 || status === 504) return 'تعذّر الوصول إلى خدمة الذكاء الاصطناعي. أعد المحاولة.';
  if (status === 400 || status === 413) return 'الرسالة أطول من المسموح أو غير صالحة. اختصرها وأعد المحاولة.';
  if (!status) return 'تعذّر الاتصال بالخادم. تحقق من الشبكة وأعد المحاولة.';
  return 'حدث خطأ غير متوقع. أعد المحاولة.';
}

export default function AiChat() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const idRef = useRef(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => () => abortRef.current?.abort(), []);
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, loading, error]);

  async function request(history: Msg[]) {
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    let timedOut = false;
    const timer = setTimeout(() => { timedOut = true; ctrl.abort(); }, TIMEOUT_MS);
    setLoading(true);
    setError(null);
    try {
      const res = await sendChat({ messages: selectHistory(history) }, { signal: ctrl.signal });
      if (abortRef.current !== ctrl) return;
      const reply = typeof res?.reply === 'string' && res.reply.trim() ? res.reply : 'لم يصل رد. حاول إعادة صياغة السؤال.';
      setMessages((m) => [...m, { id: ++idRef.current, role: 'assistant', content: reply }]);
    } catch (e) {
      if (abortRef.current !== ctrl) return;
      if (ctrl.signal.aborted && !timedOut) setError('أُلغي الطلب. يمكنك إعادة المحاولة.');
      else setError(friendly(e, timedOut));
    } finally {
      clearTimeout(timer);
      if (abortRef.current === ctrl) { abortRef.current = null; setLoading(false); }
    }
  }

  function send() {
    const text = input.trim();
    if (!text || loading || text.length > MAX_MSG) return;
    // If last message is an unanswered user message (failed), replace it rather than duplicate.
    const base = messages.length && messages[messages.length - 1].role === 'user' ? messages.slice(0, -1) : messages;
    const next = [...base, { id: ++idRef.current, role: 'user' as const, content: text }];
    setMessages(next);
    setInput('');
    void request(next);
  }

  function retry() {
    if (loading || !messages.length || messages[messages.length - 1].role !== 'user') return;
    void request(messages);
  }

  function cancel() { abortRef.current?.abort(); }

  function clear() {
    abortRef.current?.abort();
    abortRef.current = null;
    setLoading(false);
    setMessages([]);
    setError(null);
    setInput('');
    taRef.current?.focus();
  }

  function onKey(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing && e.keyCode !== 229) {
      e.preventDefault();
      send();
    }
  }

  const canRetry = !loading && messages.length > 0 && messages[messages.length - 1].role === 'user';
  const over = input.length > MAX_MSG;

  return (
    <>
      <button
        type="button"
        aria-label="فتح المساعد الذكي"
        data-testid="button-open-ai-chat"
        onClick={() => setOpen(true)}
        className="fixed bottom-5 left-5 z-40 grid h-12 w-12 place-items-center rounded-full bg-primary text-primary-foreground shadow-[0_6px_20px_-6px_hsl(var(--primary)/.6)] ring-4 ring-background transition-transform duration-200 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-ring active:translate-y-0 print:hidden"
      >
        <MessageSquareText className="h-5 w-5" aria-hidden />
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          dir="rtl"
          showCloseButton={false}
          onOpenAutoFocus={(e) => { e.preventDefault(); taRef.current?.focus(); }}
          className="flex h-[100dvh] max-h-[100dvh] max-w-none flex-col gap-0 overflow-hidden border-primary/20 bg-card p-0 text-right sm:h-[min(640px,85vh)] sm:max-w-md sm:rounded-xl"
        >
          <header className="flex items-center gap-3 border-b border-t-4 border-t-primary bg-card px-4 py-3">
            <img src={`${import.meta.env.BASE_URL}ithmar-logo-updated.png`} alt="" aria-hidden className="h-7 w-auto shrink-0" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
            <div className="min-w-0 flex-1">
              <DialogTitle className="text-sm font-semibold text-primary">المساعد الذكي</DialogTitle>
              <DialogDescription className="text-[11px] text-muted-foreground">إرشاد عام — لا يطّلع على بيانات الإنتاج</DialogDescription>
            </div>
            <button type="button" onClick={clear} disabled={!messages.length && !input && !error} aria-label="مسح المحادثة" data-testid="button-clear-chat" className="grid h-8 w-8 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-40">
              <Trash2 className="h-4 w-4" />
            </button>
            <DialogClose aria-label="إغلاق المساعد" data-testid="button-close-chat" className="grid h-8 w-8 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
              <X className="h-4 w-4" />
            </DialogClose>
          </header>

          <div ref={scrollRef} role="log" aria-live="polite" aria-relevant="additions" className="flex-1 space-y-3 overflow-y-auto bg-background px-4 py-4">
            {messages.length === 0 && !loading && (
              <div className="rise mx-auto max-w-xs py-8 text-center">
                <div className="mx-auto mb-3 grid h-10 w-10 place-items-center rounded-full bg-secondary text-primary"><MessageSquareText className="h-5 w-5" /></div>
                <p className="text-sm font-medium">كيف يمكنني المساعدة؟</p>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">اسأل عن مفاهيم الإنتاج أو صياغة تقرير أو تفسير مؤشر. لا يعرف المساعد أرقام مصنعك، فاكتب ما تريد مناقشته.</p>
              </div>
            )}
            {messages.map((m) => (
              <div key={m.id} className={`rise flex ${m.role === 'user' ? 'justify-start' : 'justify-end'}`} data-testid={`text-chat-${m.role}-${m.id}`}>
                <div className={`max-w-[85%] whitespace-pre-wrap break-words rounded-lg px-3 py-2 text-sm leading-relaxed ${m.role === 'user' ? 'rounded-tr-sm bg-primary text-primary-foreground' : 'rounded-tl-sm border bg-card text-card-foreground'}`} dir="auto">
                  {m.content}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-end" role="status" aria-label="جارٍ كتابة الرد">
                <div className="flex items-center gap-1 rounded-lg border bg-card px-3 py-3">
                  {[0, 1, 2].map((i) => <span key={i} className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary/60" style={{ animationDelay: `${i * 180}ms` }} />)}
                </div>
              </div>
            )}
            {error && (
              <div role="alert" className="rise flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive">
                <span className="flex-1">{error}</span>
                {canRetry && (
                  <button type="button" onClick={retry} data-testid="button-retry-chat" className="inline-flex items-center gap-1 rounded px-2 py-1 font-medium hover:bg-destructive/10">
                    <RotateCcw className="h-3 w-3" /> إعادة المحاولة
                  </button>
                )}
              </div>
            )}
          </div>

          <div className="border-t bg-card px-3 pb-3 pt-2">
            <p className="mb-2 flex items-start gap-1.5 text-[11px] leading-snug text-muted-foreground">
              <ShieldCheck className="mt-px h-3.5 w-3.5 shrink-0 text-primary" aria-hidden />
              <span>يُرسَل نص المحادثة الذي تكتبه فقط إلى Google Gemini؛ لا تُشارَك الملفات أو سجلات الحساب تلقائيًا. المحادثة مؤقتة وقد تكون الردود غير دقيقة — تحقّق من أي رقم قبل اعتماده.</span>
            </p>
            <div className="flex items-end gap-2">
              <label htmlFor="ai-chat-input" className="sr-only">رسالتك</label>
              <textarea
                id="ai-chat-input"
                ref={taRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={onKey}
                rows={2}
                dir="auto"
                placeholder="اكتب سؤالك… (Shift+Enter لسطر جديد)"
                aria-invalid={over}
                data-testid="input-chat"
                className="max-h-32 min-h-[44px] flex-1 resize-none rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
              {loading ? (
                <button type="button" onClick={cancel} aria-label="إيقاف الطلب" data-testid="button-cancel-chat" className="grid h-11 w-11 shrink-0 place-items-center rounded-md border border-primary/30 text-primary transition-colors hover:bg-secondary">
                  <Square className="h-4 w-4" />
                </button>
              ) : (
                <button type="button" onClick={send} disabled={!input.trim() || over} aria-label="إرسال" data-testid="button-send-chat" className="grid h-11 w-11 shrink-0 place-items-center rounded-md bg-primary text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-40">
                  <Send className="h-4 w-4 -scale-x-100" />
                </button>
              )}
            </div>
            {input.length > MAX_MSG * 0.8 && (
              <p className={`num mt-1 text-[10px] ${over ? 'text-destructive' : 'text-muted-foreground'}`}>{input.length} / {MAX_MSG}</p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
