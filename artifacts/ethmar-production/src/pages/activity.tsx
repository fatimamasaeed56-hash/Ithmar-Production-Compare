import { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'wouter';
import { Download, RotateCcw, Search, History, FolderOpen } from 'lucide-react';
import { listActivities, type Activity } from '@workspace/api-client-react';
import { useQuery } from '@tanstack/react-query';
import { groupActivities } from '@/lib/activity-groups';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useStore } from '@/lib/store';
import { cn } from '@/lib/utils';

const TZ = 'Asia/Hebron';
const PAGE = 50;

const KIND: Record<Activity['kind'], { t: string; c: string }> = {
  import: { t: 'استيراد ملفات', c: 'bg-primary text-primary-foreground' },
  note: { t: 'ملاحظة', c: 'bg-accent text-accent-foreground' },
  selection: { t: 'اختيار تشغيل', c: 'bg-muted text-foreground' },
  downtime: { t: 'ربط توقف', c: 'bg-muted text-foreground' },
};

const dayKey = (iso: string) =>
  new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(iso));
const dayLabel = (iso: string) =>
  new Intl.DateTimeFormat('ar', { timeZone: TZ, weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }).format(new Date(iso));
const timeLabel = (iso: string) =>
  new Intl.DateTimeFormat('ar', { timeZone: TZ, hour: '2-digit', minute: '2-digit' }).format(new Date(iso));

function fileUrl(id: string, fileId: string) {
  return `${import.meta.env.BASE_URL}api/archives/${encodeURIComponent(id)}/files/${encodeURIComponent(fileId)}`;
}

function Value({ label, text, tone }: { label: string; text: string; tone: 'old' | 'new' }) {
  return (
    <div className={cn('rounded border p-2', tone === 'old' ? 'bg-muted/40' : 'bg-background')}>
      <div className="mb-1 text-[10px] text-muted-foreground">{label}</div>
      {text ? (
        <p dir="auto" className="whitespace-pre-wrap break-words text-xs">{text}</p>
      ) : (
        <p className="text-xs text-muted-foreground">فارغ</p>
      )}
    </div>
  );
}

function Row({ a, events }: { a: Activity; events: Activity[] }) {
  const { archives, datasets, setActiveId, isArchiveLoading, reloadArchives } = useStore();
  const [, navigate] = useLocation();
  const [err, setErr] = useState<string | null>(null);
  const archive = archives.find((x) => x.id === a.archiveId);
  const k = KIND[a.kind] ?? { t: a.kind, c: 'bg-muted' };
  const reopen = () => {
    if (datasets.some((d) => d.id === a.archiveId)) {
      setErr(null);
      setActiveId(a.archiveId);
      navigate('/sources');
    } else {
      setErr('هذا السجل غير محمّل حاليًا. أعد تحميل الأرشيف ثم حاول مجددًا؛ إن استمر فقد يكون محذوفًا أو غير متاح.');
    }
  };
  return (
    <li className="rise rounded-md border bg-card p-4" data-testid={`activity-${a.id}`}>
      <div className="flex flex-wrap items-center gap-2">
        <span className="num text-xs text-muted-foreground">{timeLabel(a.createdAt)}</span>
        <span className={cn('rounded-sm px-1.5 py-0.5 text-[10px]', k.c)}>{k.t}</span>
        <h3 dir="auto" className="text-sm font-semibold break-all">{a.title}</h3>
        <Button size="sm" variant="outline" className="ms-auto h-7" onClick={reopen} data-testid={`button-reopen-${a.id}`}>
          <FolderOpen className="size-3.5" /> إعادة فتح
        </Button>
      </div>
      {err && (
        <div role="alert" className="mt-2 flex flex-wrap items-center gap-2 rounded border border-destructive/40 p-2 text-xs text-destructive">
          {err}
          <Button size="sm" variant="ghost" className="h-7" disabled={isArchiveLoading}
            onClick={() => { void reloadArchives().then(() => setErr(null)); }}>
            <RotateCcw className="size-3.5" /> {isArchiveLoading ? 'جارٍ التحميل…' : 'إعادة تحميل الأرشيف'}
          </Button>
        </div>
      )}
      {archive && archive.files.length > 0 && (
        <ul className="mt-3 flex flex-wrap gap-2">
          {archive.files.map((f) => (
            <li key={f.id}>
              <a href={fileUrl(archive.id, f.id)} download={f.name}
                className="inline-flex items-center gap-1 rounded border px-2 py-1 text-[11px] hover:bg-muted">
                <Download className="size-3" /> <span className="break-all">{f.name}</span>
                <span className="num text-muted-foreground">({(f.size / 1024).toFixed(1)} ك.ب)</span>
              </a>
            </li>
          ))}
        </ul>
      )}
      {archive && archive.note && (
        <div className="mt-2">
          <Value label="الملاحظة الحالية المحفوظة" text={archive.note} tone="new" />
        </div>
      )}
      <details className="mt-3 border-t pt-2">
        <summary className="cursor-pointer text-xs text-primary">
          عرض سجل الملاحظات والتعديلات ({events.length})
        </summary>
        <ol className="mt-3 space-y-3">
          {events.map((event) => (
            <li key={event.id} className="rounded border p-2 text-xs">
              <p className="text-muted-foreground">
                {KIND[event.kind]?.t} · {dayLabel(event.createdAt)} · {timeLabel(event.createdAt)}
              </p>
              {event.kind !== 'import' && (
                <div className="mt-2 grid gap-2 md:grid-cols-2">
                  <Value label="قبل التغيير" text={event.before} tone="old" />
                  <Value label="بعد التغيير" text={event.after} tone="new" />
                </div>
              )}
              {event.archiveId !== a.archiveId && (
                <Button variant="ghost" size="sm" className="mt-2"
                  onClick={() => { setActiveId(event.archiveId); navigate('/sources'); }}>
                  فتح النسخة المرتبطة بهذا التعديل
                </Button>
              )}
            </li>
          ))}
        </ol>
      </details>
    </li>
  );
}

export default function ActivityPage({ userId }: { userId: string }) {
  const [input, setInput] = useState('');
  const [q, setQ] = useState('');
  const [day, setDay] = useState('');
  const [offset, setOffset] = useState(0);
  const { archiveError, archives } = useStore();

  useEffect(() => {
    const t = setTimeout(() => setQ(input.trim()), 400);
    return () => clearTimeout(t);
  }, [input]);
  useEffect(() => setOffset(0), [q, day]);

  const validDay = !day || /^\d{4}-\d{2}-\d{2}$/.test(day);
  const params = { q: q || undefined, day: validDay ? day || undefined : undefined };
  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ['activities', userId, params], enabled: validDay, retry: false,
    queryFn: async ({ signal }) => {
      const items: Activity[] = [];
      for (let cursor = 0; ; cursor += PAGE) {
        const page = await listActivities({ ...params, offset: cursor }, { signal });
        items.push(...page.items);
        if (!page.hasMore) return items;
      }
    },
  });

  const fileGroups = useMemo(() => groupActivities(data ?? [], archives), [data, archives]);
  const groups = useMemo(() => {
    const m = new Map<string, { label: string; items: Activity[][] }>();
    for (const events of fileGroups.slice(offset, offset + PAGE)) {
      const a = events[0];
      const k = dayKey(a.createdAt);
      if (!m.has(k)) m.set(k, { label: dayLabel(a.createdAt), items: [] });
      m.get(k)!.items.push(events);
    }
    return [...m.entries()];
  }, [fileGroups, offset]);

  return (
    <div className="space-y-5">
      <div className="rise">
        <h1 className="text-2xl font-semibold tracking-tight">سجل النشاطات</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          يظهر كل ملف مرة واحدة، وملاحظاته وتعديلاته داخل سجله. مرتبة حسب آخر نشاط بتوقيت الخليل ({TZ}).
        </p>
      </div>
      <form className="flex flex-wrap items-end gap-2 rounded-md border bg-card p-3"
        onSubmit={(e) => { e.preventDefault(); setQ(input.trim()); }}>
        <label className="min-w-56 flex-1 text-xs">بحث
          <Input className="mt-1" value={input} maxLength={200} onChange={(e) => setInput(e.target.value)}
            placeholder="عنوان، ملف، ملاحظة…" data-testid="input-activity-search" />
        </label>
        <label className="text-xs">اليوم ({TZ})
          <Input type="date" dir="ltr" min="1900-01-01" max="9999-12-31" className="mt-1" value={day} onChange={(e) => setDay(e.target.value)} data-testid="input-activity-day" />
          {!validDay && <p role="alert" className="mt-1 text-xs text-destructive">اختر تاريخًا صالحًا بسنة مكوّنة من أربعة أرقام.</p>}
        </label>
        <Button type="submit"><Search className="size-4" /> بحث</Button>
        {(input || day) && <Button type="button" variant="ghost" onClick={() => { setInput(''); setQ(''); setDay(''); }}>مسح</Button>}
      </form>
      {archiveError && <p role="alert" className="text-xs text-destructive">تعذّر تحميل الأرشيف: {archiveError}</p>}

      {isLoading ? (
        <div className="space-y-3" aria-busy="true">
          {[0, 1, 2].map((i) => <div key={i} className="h-24 animate-pulse rounded-md border bg-muted/40" />)}
        </div>
      ) : isError ? (
        <div role="alert" className="rounded-md border border-destructive/40 bg-card p-6 text-center text-sm">
          <p className="text-destructive">تعذّر تحميل سجل النشاطات.</p>
          <Button className="mt-3" variant="outline" onClick={() => refetch()}><RotateCcw className="size-4" /> إعادة المحاولة</Button>
        </div>
      ) : groups.length === 0 ? (
        <div className="rounded-md border border-dashed bg-card p-10 text-center">
          <History className="mx-auto size-8 text-primary" />
          <p className="mt-2 text-sm font-medium">{q || day ? 'لا نتائج مطابقة لهذا البحث.' : 'لا نشاطات بعد.'}</p>
          <p className="mt-1 text-xs text-muted-foreground">يُسجَّل تلقائيًا كل استيراد CSV وكل تعديل على الملاحظات أو الاختيارات.</p>
        </div>
      ) : (
        <div className={cn('space-y-6', isFetching && 'opacity-70')}>
          {groups.map(([k, g]) => (
            <section key={k}>
              <h2 className="sticky top-0 z-10 mb-2 border-b bg-background/95 py-1 text-sm font-semibold text-primary">
                {g.label} <span className="text-[11px] font-normal text-muted-foreground">· {TZ}</span>
              </h2>
              <ol className="space-y-2">{g.items.map((events) => <Row key={events[0].id} a={events[0]} events={events} />)}</ol>
            </section>
          ))}
        </div>
      )}

      {(offset > 0 || fileGroups.length > PAGE) && (
        <div className="flex items-center justify-between">
          <Button variant="outline" disabled={offset === 0 || isFetching} onClick={() => setOffset(Math.max(0, offset - PAGE))}>الأحدث</Button>
          <span className="num text-xs text-muted-foreground">{offset + 1} – {Math.min(offset + PAGE, fileGroups.length)} / {fileGroups.length} ملف</span>
          <Button variant="outline" disabled={offset + PAGE >= fileGroups.length || isFetching} onClick={() => setOffset(offset + PAGE)}>الأقدم</Button>
        </div>
      )}
    </div>
  );
}
