export function SystemTerms() {
  return (
    <section className="mb-6 rounded-md border bg-card p-4 text-sm" aria-label="تعريف الأداة والمصطلحات">
      <p className="font-semibold text-primary">أداة عرض للقراءة فقط من صادرات المصنع المعتمدة</p>
      <p className="mt-1 leading-7 text-muted-foreground">
        تعرض مدخلات المواد والإنتاج السليم ووقت تغيير القالب لكل دورة تشغيل، مع فتح الصف الأصلي خلف كل رقم.
        استخدم صادرات معتمدة من المصنع؛ الأداة لا تتحقق بنفسها من اعتماد الملف.
      </p>
      <details className="mt-3 border-t pt-3">
        <summary className="cursor-pointer font-medium">المصطلحات المستخدمة في النظام</summary>
        <dl className="mt-3 grid gap-3 sm:grid-cols-3">
          <div><dt className="font-semibold">تخطيط موارد المؤسسات (ERP)</dt><dd className="mt-1 leading-6 text-muted-foreground">نظام إدارة الأعمال الحالي للمصنع.</dd></div>
          <div><dt className="font-semibold">ملف CSV</dt><dd className="mt-1 leading-6 text-muted-foreground">ملف تصدير يشبه جدول البيانات، يحتوي على صفوف وأعمدة. يُقرأ محليًا داخل المتصفح دون إرسال الملف أو حفظه.</dd></div>
          <div><dt className="font-semibold">للقراءة فقط</dt><dd className="mt-1 leading-6 text-muted-foreground">هذا النموذج الأولي لا يستطيع تغيير النظام الأصلي أو ملف المصدر، ولا يرسل أي بيانات إلى ERP.</dd></div>
        </dl>
      </details>
    </section>
  );
}
