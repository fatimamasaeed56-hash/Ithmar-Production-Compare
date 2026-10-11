import { Router } from 'express';
import { GoogleGenAI } from '@google/genai';
import { SendChatBody, SendChatResponse } from '@workspace/api-zod';

const router = Router();
// Per-process account limits; no conversation or credentials are persisted.
const limits = new Map<string, { started: number; count: number; busy: boolean }>();
const cleanup = setInterval(() => {
  for (const [id, state] of limits) if (!state.busy && Date.now() - state.started > 60000) limits.delete(id);
}, 60000);
cleanup.unref();

router.post('/chat', async (req, res) => {
  res.set('Cache-Control', 'no-store');
  if (!req.isAuthenticated()) { res.status(401).json({ error: 'سجّل الدخول لاستخدام المساعد.' }); return; }
  const origin = req.get('origin');
  let foreign = req.get('sec-fetch-site') === 'cross-site';
  try { if (origin) foreign ||= new URL(origin).host !== (req.get('x-forwarded-host') || req.get('host')); }
  catch { foreign = true; }
  if (foreign) { res.status(403).json({ error: 'طلب غير مسموح.' }); return; }
  const parsed = SendChatBody.safeParse(req.body);
  if (!parsed.success || parsed.data.messages.reduce((n, m) => n + m.content.length, 0) > 20000 ||
      parsed.data.messages.some((m, i) => !m.content.trim() || m.role !== (i % 2 === 0 ? 'user' : 'assistant')) ||
      parsed.data.messages.at(-1)?.role !== 'user') {
    res.status(400).json({ error: 'المحادثة طويلة أو غير صالحة. ابدأ محادثة جديدة أو اختصر رسالتك.' }); return;
  }
  const key = process.env.gemini_api_key;
  if (!key) { res.status(503).json({ error: 'خدمة المساعد غير مهيأة حاليًا.' }); return; }
  const id = req.user!.id;
  const now = Date.now();
  const previous = limits.get(id);
  const state = previous && (previous.busy || now - previous.started < 60000) ? previous : { started: now, count: 0, busy: false };
  if (state.busy || state.count >= 10) { res.set('Retry-After', '60').status(429).json({ error: 'انتظر قليلًا ثم أعد المحاولة.' }); return; }
  state.busy = true;
  state.count++;
  limits.set(id, state);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 45000);
  const disconnect = () => { if (!res.writableEnded) controller.abort(); };
  res.on('close', disconnect);
  try {
    const client = new GoogleGenAI({ apiKey: key });
    const result = await client.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: parsed.data.messages.map((m) => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] })),
      config: {
        abortSignal: controller.signal,
        maxOutputTokens: 8192,
        systemInstruction: 'أنت مساعد عربي لمنصة عامة لمقارنة سجلات الإنتاج تستخدمها شركات مختلفة، ولا تمثل شركة بعينها. لا تفترض اسم شركة المستخدم أو مجالها. أجب بالعربية بوضوح واختصار. لا تملك وصولًا إلى ملفات الإنتاج أو الحساب أو ERP ولا تستطيع تعديلها. استخدم فقط بيانات المستخدم المكتوبة في المحادثة ولا تختلق أرقامًا أو معرّفات. معدل الخردة هو الخردة ÷ المدخلات ×100 والفروق بوحدة نقاط مئوية. التوقف غير المخطط منفصل عن تغيير القالب ولا تفترض علاقة سببية. إذا لم تعرف قل ذلك. لا تدّع حفظ بيانات أو تنفيذ عمليات أو قراءة ملفات. لا تطلب أسرارًا أو كلمات مرور.',
      },
    });
    const reply = result.text?.trim();
    if (!reply) { res.status(502).json({ error: 'لم يُرجع المساعد إجابة. حاول صياغة السؤال بشكل آخر.' }); return; }
    if (!res.destroyed) res.json(SendChatResponse.parse({ reply }));
  } catch (error) {
    // Never log provider errors: they may contain credentials or message text.
    const status = (error as { status?: number })?.status;
    if (!res.destroyed) res.status(controller.signal.aborted ? 504 : status === 429 ? 429 : 502).json({
      error: controller.signal.aborted ? 'انتهت مهلة الرد. أعد المحاولة.' : status === 429 ? 'خدمة Gemini مشغولة أو بلغت حد الاستخدام. حاول لاحقًا.' : 'تعذر الاتصال بـGemini. حاول لاحقًا.',
    });
  } finally {
    clearTimeout(timeout);
    res.off('close', disconnect);
    state.busy = false;
  }
});
export default router;
