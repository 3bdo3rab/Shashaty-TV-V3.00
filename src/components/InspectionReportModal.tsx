import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  ShieldCheck, 
  Cpu, 
  HardDrive, 
  Clock, 
  Download, 
  X, 
  Wrench, 
  ChevronDown, 
  ChevronUp, 
  Search, 
  Layers, 
  Activity, 
  Check, 
  Sparkles,
  Zap,
  Filter
} from 'lucide-react';
import { QAReport, QAIssue, IssueSeverity } from '../utils/inspectionEngine';

interface InspectionReportModalProps {
  report: QAReport;
  onClose: () => void;
  onAutoFix?: (issue: QAIssue) => Promise<void>;
}

export const InspectionReportModal: React.FC<InspectionReportModalProps> = ({
  report,
  onClose,
  onAutoFix
}) => {
  const [activeTab, setActiveTab] = useState<'issues' | 'performance'>('issues');
  const [selectedSeverity, setSelectedSeverity] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedIssueIds, setExpandedIssueIds] = useState<Set<string>>(new Set());
  const [fixingIssueId, setFixingIssueId] = useState<string | null>(null);
  const [fixedIssueIds, setFixedIssueIds] = useState<Set<string>>(new Set());

  const toggleExpand = (id: string) => {
    setExpandedIssueIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const filteredIssues = report.issues.filter(issue => {
    const matchesSeverity = selectedSeverity === 'all' || issue.severity === selectedSeverity;
    const matchesSearch = searchQuery.trim() === '' || 
      issue.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      issue.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      issue.affectedElement.toLowerCase().includes(searchQuery.toLowerCase()) ||
      issue.page.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSeverity && matchesSearch;
  });

  const handleExportJSON = () => {
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `qa-report-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleFix = async (issue: QAIssue) => {
    if (!onAutoFix) return;
    try {
      setFixingIssueId(issue.id);
      await onAutoFix(issue);
      setFixedIssueIds(prev => new Set(prev).add(issue.id));
    } catch (err) {
      console.error('Failed auto fix:', err);
    } finally {
      setFixingIssueId(null);
    }
  };

  const getSeverityBadge = (severity: IssueSeverity) => {
    switch (severity) {
      case 'critical':
        return <span className="bg-red-500/20 text-red-300 border border-red-500/40 px-2.5 py-0.5 rounded-full text-xs font-bold">حرجة ❌</span>;
      case 'high':
        return <span className="bg-orange-500/20 text-orange-300 border border-orange-500/40 px-2.5 py-0.5 rounded-full text-xs font-bold">عالية ⚠️</span>;
      case 'medium':
        return <span className="bg-amber-500/20 text-amber-300 border border-amber-500/40 px-2.5 py-0.5 rounded-full text-xs font-bold">متوسطة 🟡</span>;
      case 'low':
        return <span className="bg-blue-500/20 text-blue-300 border border-blue-500/40 px-2.5 py-0.5 rounded-full text-xs font-bold">منخفضة 🔵</span>;
    }
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-xl">
      <motion.div
        initial={{ scale: 0.94, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.94, opacity: 0, y: 20 }}
        className="glass-card w-full max-w-5xl max-h-[92vh] flex flex-col rounded-[2.5rem] border border-emerald-500/30 shadow-2xl bg-zinc-950/95 overflow-hidden text-right text-white dir-rtl"
      >
        {/* Header */}
        <div className="p-5 sm:p-7 border-b border-white/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-gradient-to-r from-emerald-950/40 via-zinc-900 to-zinc-950">
          <div className="flex items-center gap-3.5">
            <div className="p-3 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-2xl shadow-inner">
              <ShieldCheck className="w-8 h-8" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl sm:text-2xl font-black text-white">تقرير الفحص الشامل وضمان الجودة (QA Mode)</h2>
                <span className={`px-3 py-0.5 rounded-full text-xs font-extrabold border ${
                  report.performance.overallRating === 'ممتاز'
                    ? 'bg-green-500/20 text-green-300 border-green-500/40'
                    : report.performance.overallRating === 'جيد'
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                    : 'bg-red-500/20 text-red-300 border-red-500/40'
                }`}>
                  الأداء: {report.performance.overallRating}
                </span>
              </div>
              <p className="text-xs text-white/60 mt-0.5 font-medium flex items-center gap-2">
                <Clock className="w-3.5 h-3.5 text-emerald-400" />
                <span>تاريخ الفحص: {report.timestamp}</span>
                <span className="text-white/30">•</span>
                <span>استغرق {report.executionTimeMs} ملي ثانية</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-center">
            <button
              onClick={handleExportJSON}
              className="glass px-4 py-2 rounded-xl text-xs font-bold text-emerald-300 hover:bg-emerald-500/20 border border-emerald-500/30 transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Download className="w-4 h-4" />
              تصدير التقرير (JSON)
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 hover:text-white transition-all cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Metric Cards Row */}
        <div className="p-4 sm:p-6 grid grid-cols-2 sm:grid-cols-5 gap-3 border-b border-white/10 bg-black/40">
          <div className="bg-white/5 border border-white/10 p-3.5 rounded-2xl">
            <div className="text-xs text-white/60 font-medium mb-1">الصفحات المفحوصة</div>
            <div className="text-2xl font-black text-white flex items-center gap-1.5">
              <span>{report.testedPagesCount}</span>
              <span className="text-xs text-emerald-400 font-normal">صفحات</span>
            </div>
          </div>

          <div className="bg-white/5 border border-white/10 p-3.5 rounded-2xl">
            <div className="text-xs text-white/60 font-medium mb-1">الوظائف المختبرة</div>
            <div className="text-2xl font-black text-white flex items-center gap-1.5">
              <span>{report.testedFunctionsCount}</span>
              <span className="text-xs text-cyan-400 font-normal">اختبار</span>
            </div>
          </div>

          <div className="bg-green-500/10 border border-green-500/20 p-3.5 rounded-2xl">
            <div className="text-xs text-green-300 font-medium mb-1">الاختبارات الناجحة</div>
            <div className="text-2xl font-black text-green-400 flex items-center gap-1.5">
              <CheckCircle2 className="w-5 h-5 text-green-400" />
              <span>{report.passedCount}</span>
            </div>
          </div>

          <div className="bg-amber-500/10 border border-amber-500/20 p-3.5 rounded-2xl">
            <div className="text-xs text-amber-300 font-medium mb-1">التحذيرات</div>
            <div className="text-2xl font-black text-amber-400 flex items-center gap-1.5">
              <AlertTriangle className="w-5 h-5 text-amber-400" />
              <span>{report.warningsCount}</span>
            </div>
          </div>

          <div className="bg-red-500/10 border border-red-500/20 p-3.5 rounded-2xl col-span-2 sm:col-span-1">
            <div className="text-xs text-red-300 font-medium mb-1">الأخطاء والمشاكل</div>
            <div className="text-2xl font-black text-red-400 flex items-center gap-1.5">
              <XCircle className="w-5 h-5 text-red-400" />
              <span>{report.errorsCount}</span>
            </div>
          </div>
        </div>

        {/* Tab Navigation & Search */}
        <div className="p-4 border-b border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3 bg-zinc-900/60">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              onClick={() => setActiveTab('issues')}
              className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'issues'
                  ? 'bg-emerald-500 text-black shadow-lg shadow-emerald-500/20'
                  : 'bg-white/5 text-white/70 hover:bg-white/10'
              }`}
            >
              <AlertTriangle className="w-4 h-4" />
              <span>سجل المشاكل والتحذيرات ({report.issues.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('performance')}
              className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'performance'
                  ? 'bg-emerald-500 text-black shadow-lg shadow-emerald-500/20'
                  : 'bg-white/5 text-white/70 hover:bg-white/10'
              }`}
            >
              <Activity className="w-4 h-4" />
              <span>قياس الأداء واستجابة التطبيق</span>
            </button>
          </div>

          {activeTab === 'issues' && (
            <div className="flex items-center gap-2 w-full sm:w-auto">
              {/* Severity Filter */}
              <select
                value={selectedSeverity}
                onChange={(e) => setSelectedSeverity(e.target.value)}
                className="bg-zinc-900 border border-white/15 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500 cursor-pointer"
              >
                <option value="all">جميع مستويات الخطورة</option>
                <option value="critical">❌ حرجة فقط</option>
                <option value="high">⚠️ عالية فقط</option>
                <option value="medium">🟡 متوسطة فقط</option>
                <option value="low">🔵 منخفضة فقط</option>
              </select>

              {/* Search */}
              <div className="relative flex-1 sm:w-48">
                <Search className="w-3.5 h-3.5 absolute right-3 top-2.5 text-white/40" />
                <input
                  type="text"
                  placeholder="بحث في التقرير..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-zinc-900 border border-white/15 rounded-xl pr-8 pl-3 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>
          )}
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-3 no-scrollbar">
          {activeTab === 'issues' ? (
            filteredIssues.length === 0 ? (
              <div className="text-center py-16 text-white/60 space-y-3">
                <CheckCircle2 className="w-16 h-16 text-emerald-400 mx-auto opacity-80" />
                <h3 className="text-lg font-bold text-white">لم يتم العثور على مشاكل مطابقة!</h3>
                <p className="text-xs text-white/60">جميع الاختبارات المطلوبة لهذه الفئة مرت بسلام وبدون أخطاء.</p>
              </div>
            ) : (
              filteredIssues.map((issue) => {
                const isExpanded = expandedIssueIds.has(issue.id);
                const isFixed = fixedIssueIds.has(issue.id);
                const isFixing = fixingIssueId === issue.id;

                return (
                  <motion.div
                    key={issue.id}
                    layout
                    className={`border rounded-2xl transition-all overflow-hidden ${
                      isFixed
                        ? 'bg-green-500/5 border-green-500/30'
                        : issue.severity === 'critical'
                        ? 'bg-red-500/5 border-red-500/30 hover:border-red-500/50'
                        : issue.severity === 'high'
                        ? 'bg-orange-500/5 border-orange-500/30 hover:border-orange-500/50'
                        : issue.severity === 'medium'
                        ? 'bg-amber-500/5 border-amber-500/30 hover:border-amber-500/50'
                        : 'bg-blue-500/5 border-blue-500/30 hover:border-blue-500/50'
                    }`}
                  >
                    {/* Item Summary Bar */}
                    <div
                      onClick={() => toggleExpand(issue.id)}
                      className="p-4 flex items-center justify-between gap-3 cursor-pointer hover:bg-white/5 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="shrink-0">
                          {getSeverityBadge(issue.severity)}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className={`font-bold text-sm sm:text-base ${isFixed ? 'line-through text-white/50' : 'text-white'}`}>
                              {issue.title}
                            </h4>
                            <span className="text-[10px] bg-white/10 px-2 py-0.5 rounded-md text-white/70 font-mono">
                              {issue.page}
                            </span>
                          </div>
                          <p className="text-xs text-white/60 mt-0.5">
                            العنصر المتأثر: <span className="text-emerald-300 font-semibold">{issue.affectedElement}</span>
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {issue.autoFixable && onAutoFix && !isFixed && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleFix(issue);
                            }}
                            disabled={isFixing}
                            className="bg-emerald-500 text-black font-extrabold px-3 py-1 rounded-xl text-xs hover:bg-emerald-400 transition-all flex items-center gap-1 shrink-0 shadow-md cursor-pointer"
                          >
                            {isFixing ? (
                              <Zap className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Wrench className="w-3.5 h-3.5" />
                            )}
                            <span>{isFixing ? 'جاري الإصلاح...' : 'إصلاح تلقائي'}</span>
                          </button>
                        )}

                        {isFixed && (
                          <span className="bg-green-500/20 text-green-300 border border-green-500/40 text-xs px-2.5 py-1 rounded-xl font-bold flex items-center gap-1">
                            <Check className="w-3.5 h-3.5" />
                            <span>تم الإصلاح بنجاح</span>
                          </span>
                        )}

                        <div className="p-1 rounded-lg bg-white/5 text-white/60">
                          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </div>
                      </div>
                    </div>

                    {/* Detailed Dropdown Breakdown */}
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="px-4 pb-4 pt-2 border-t border-white/10 bg-black/30 space-y-3 text-xs"
                        >
                          <div>
                            <span className="text-white/40 font-bold block mb-1">وصف المشكلة:</span>
                            <p className="text-white/90 bg-white/5 p-2.5 rounded-xl border border-white/10 leading-relaxed">
                              {issue.description}
                            </p>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div className="bg-red-500/10 border border-red-500/20 p-2.5 rounded-xl">
                              <span className="text-red-300 font-bold block mb-0.5">النتيجة الحالية (الخلل):</span>
                              <span className="text-white/80">{issue.currentResult}</span>
                            </div>

                            <div className="bg-green-500/10 border border-green-500/20 p-2.5 rounded-xl">
                              <span className="text-green-300 font-bold block mb-0.5">النتيجة المتوقعة:</span>
                              <span className="text-white/80">{issue.expectedResult}</span>
                            </div>
                          </div>

                          <div>
                            <span className="text-white/40 font-bold block mb-1">خطوات إعادة الإنتاج:</span>
                            <p className="text-white/70 font-mono bg-black/50 p-2 rounded-lg border border-white/5">
                              {issue.stepsToReproduce}
                            </p>
                          </div>

                          {issue.suggestedFix && (
                            <div className="bg-emerald-500/10 border border-emerald-500/20 p-2.5 rounded-xl flex items-start gap-2">
                              <Sparkles className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                              <div>
                                <span className="text-emerald-300 font-bold block">اقتراح الإصلاح الموصى به:</span>
                                <span className="text-white/90">{issue.suggestedFix}</span>
                              </div>
                            </div>
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                );
              })
            )
          ) : (
            /* Performance Tab */
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="glass-card p-5 rounded-2xl border border-white/10 bg-white/5">
                  <div className="flex items-center gap-3 mb-2">
                    <Clock className="w-6 h-6 text-emerald-400" />
                    <div>
                      <h4 className="font-bold text-white text-sm">سرعة تحليل المكتبة</h4>
                      <p className="text-[10px] text-white/50">Parse & Index Time</p>
                    </div>
                  </div>
                  <div className="text-2xl font-black text-emerald-400 font-mono">
                    {report.performance.libraryParseTimeMs} ms
                  </div>
                  <p className="text-[11px] text-white/60 mt-1">
                    تمت معالجة {report.performance.totalItemsScanned} ملف ميديا في المكتبة.
                  </p>
                </div>

                <div className="glass-card p-5 rounded-2xl border border-white/10 bg-white/5">
                  <div className="flex items-center gap-3 mb-2">
                    <Cpu className="w-6 h-6 text-cyan-400" />
                    <div>
                      <h4 className="font-bold text-white text-sm">سرعة توام القنوات</h4>
                      <p className="text-[10px] text-white/50">Channel Sync Latency</p>
                    </div>
                  </div>
                  <div className="text-2xl font-black text-cyan-400 font-mono">
                    {report.performance.channelSyncLatencyMs} ms
                  </div>
                  <p className="text-[11px] text-white/60 mt-1">
                    احتساب جدول البث التلقائي وتدوير العروض.
                  </p>
                </div>

                <div className="glass-card p-5 rounded-2xl border border-white/10 bg-white/5">
                  <div className="flex items-center gap-3 mb-2">
                    <HardDrive className="w-6 h-6 text-purple-400" />
                    <div>
                      <h4 className="font-bold text-white text-sm">استهلاك الذاكرة المقدر</h4>
                      <p className="text-[10px] text-white/50">Memory Overhead</p>
                    </div>
                  </div>
                  <div className="text-2xl font-black text-purple-400 font-mono">
                    ~{report.performance.memoryEstimateMB} MB
                  </div>
                  <p className="text-[11px] text-white/60 mt-1">
                    حجم الكائنات المخزنة ومؤشرات الصور والملفات.
                  </p>
                </div>
              </div>

              {/* Performance Diagnostics Box */}
              <div className="bg-zinc-900/90 border border-white/10 p-5 rounded-2xl space-y-3">
                <h4 className="font-bold text-base text-white flex items-center gap-2">
                  <Activity className="w-5 h-5 text-emerald-400" />
                  <span>توصيات تحسين أداء وسلاسة التطبيق</span>
                </h4>

                <ul className="space-y-2 text-xs text-white/80 list-disc pr-5 leading-relaxed">
                  <li>استخدام أجهزة تخزين SSD أو محركات أقراص حديثة لضمان سرعة قراءة العناوين والمستندات.</li>
                  <li>توليد صور المصغرات المقتطعة مرة واحدة وحفظها في Cache الذاكرة المحلية كـ Data URLs.</li>
                  <li>التقليل من القوائم الفارغة أو معرفات المحتوى المحذوف لمنع استهلاك دورات المعالجة دون فائدة.</li>
                  <li>استخدام صيغ مجتمعية خفيفة ومجربة مثل MP4 (H.264 / AAC) للحصول على أقصى أداء مع مشغل المتصفح.</li>
                </ul>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-white/10 bg-black/60 flex items-center justify-between text-xs text-white/60">
          <span>نظام الفحص الشامل وضمان الجودة v2.4 • جاهز لاختبارات ما قبل الإصدار (Release Candidate)</span>
          <button
            onClick={onClose}
            className="bg-white text-black font-extrabold px-6 py-2 rounded-xl hover:bg-white/90 transition-all cursor-pointer"
          >
            إغلاق التقرير
          </button>
        </div>
      </motion.div>
    </div>
  );
};
