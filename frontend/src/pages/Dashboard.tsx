import { useEffect, useState } from 'react';
import { getAnalytics, exportCsvUrl } from '../api/client';
import { XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, AreaChart, Area } from 'recharts';
import { 
  Download, 
  Users, 
  ArrowRight, 
  Zap, 
  Target, 
  Activity, 
  TrendingUp, 
  ShieldCheck,
  CalendarDays,
  Clock
} from 'lucide-react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';

export default function Dashboard() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getAnalytics()
      .then((res) => {
        setData(res);
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="flex h-96 items-center justify-center">
      <div className="flex flex-col items-center gap-6">
        <div className="relative w-16 h-16">
          <div className="absolute inset-0 border-4 border-primary/20 rounded-full" />
          <div className="absolute inset-0 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
        <span className="text-secondary font-bold tracking-widest text-sm uppercase animate-pulse">Synchronizing Data</span>
      </div>
    </div>
  );

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const item = {
    hidden: { y: 20, opacity: 0 },
    show: { y: 0, opacity: 1 }
  };

  const stats = [
    { title: 'Total Registry', value: data?.total_students || 0, sub: 'Enrolled Students', icon: Users, color: 'text-primary', bg: 'bg-primary-container/30' },
    { title: 'Engagement', value: `${data?.attendance_rate || 0}%`, sub: 'Attendance Rate', icon: Target, color: 'text-tertiary', bg: 'bg-tertiary-container/30' },
    { title: 'Live Pulse', value: data?.recent_attendance?.length || 0, sub: 'Active Sessions', icon: Activity, color: 'text-secondary', bg: 'bg-secondary-container/30' },
  ];

  return (
    <motion.div 
      variants={container}
      initial="hidden"
      animate="show"
      className="space-y-12 pb-20"
    >
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 md:gap-8">
        <div>
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-2 mb-3 px-3 py-1 bg-primary/5 border border-primary/10 rounded-full w-fit"
          >
            <ShieldCheck size={14} className="text-primary" />
            <span className="text-[10px] font-bold text-primary uppercase tracking-widest">System Operational</span>
          </motion.div>
          <motion.h1 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-on-surface font-headline mb-3"
          >
            Analytics <span className="text-primary italic font-normal">Hub</span>
          </motion.h1>
          <div className="flex items-center gap-4 text-secondary font-label text-sm">
            <div className="flex items-center gap-1.5 font-bold">
              <CalendarDays size={16} />
              {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
            </div>
            <div className="w-1.5 h-1.5 rounded-full bg-outline-variant" />
            <div className="flex items-center gap-1.5 font-bold italic">
              <Clock size={16} />
              Real-time update
            </div>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row w-full md:w-auto items-stretch sm:items-center gap-3 sm:gap-4">
          <a 
            href={exportCsvUrl()} 
            className="group inline-flex items-center justify-center rounded-2xl text-sm font-bold bg-surface-container-high text-on-surface hover:bg-surface-container-highest h-12 sm:h-14 px-5 sm:px-8 transition-all gap-2 border border-outline-variant/50 active:scale-95 shadow-sm w-full sm:w-auto"
          >
            <Download className="w-4 h-4 transition-transform group-hover:-translate-y-1" />
            Export Data
          </a>
          <Link 
            to="/attendance" 
            className="group inline-flex items-center justify-center rounded-2xl text-sm font-bold bg-primary text-on-primary hover:shadow-xl hover:shadow-primary/20 h-12 sm:h-14 px-5 sm:px-8 transition-all gap-2 active:scale-95 overflow-hidden relative w-full sm:w-auto"
          >
            <div className="absolute inset-0 bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
            <Zap className="w-4 h-4 fill-on-primary relative z-10" />
            <span className="relative z-10">Initiate Protocol</span>
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 sm:gap-6 md:grid-cols-2 lg:grid-cols-3">
        {stats.map((stat, i) => (
          <motion.div key={i} variants={item}>
            <div className="bg-surface-container-lowest p-6 sm:p-8 rounded-[2rem] sm:rounded-[2.5rem] border border-outline-variant/50 shadow-sm hover:shadow-xl hover:shadow-primary/5 transition-all duration-500 group relative overflow-hidden">
              <div className="absolute top-[-10%] right-[-5%] p-4 opacity-[0.03] group-hover:opacity-[0.05] transition-opacity scale-150 rotate-12">
                <stat.icon size={120} className={stat.color} />
              </div>
              
              <div className="relative z-10 flex flex-col gap-6">
                <div className={`w-14 h-14 rounded-2xl ${stat.bg} ${stat.color} flex items-center justify-center shadow-inner`}>
                  <stat.icon size={28} />
                </div>
                
                <div>
                  <p className="text-[10px] font-bold text-secondary uppercase tracking-[0.2em] mb-1">{stat.title}</p>
                  <div className="flex items-baseline gap-3">
                    <h3 className="text-5xl font-black text-on-surface tracking-tighter">{stat.value}</h3>
                    <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-success-container/30 text-success text-[10px] font-bold">
                      <TrendingUp size={10} />
                      +12%
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-2 text-xs text-outline font-bold italic">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                  {stat.sub}
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Chart Section */}
        <motion.div variants={item} className="lg:col-span-2">
          <div className="bg-surface-container-lowest p-6 sm:p-10 rounded-[2rem] sm:rounded-[3rem] border border-outline-variant/60 shadow-sm h-full flex flex-col">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-8 sm:mb-10">
              <div>
                <h2 className="text-2xl sm:text-3xl font-black text-on-surface font-headline tracking-tight">Biometric Stream</h2>
                <p className="text-secondary font-label text-sm mt-1 font-bold italic opacity-70">Presence frequency analysis</p>
              </div>
              <div className="flex items-center gap-1 bg-surface-container-high p-1.5 rounded-2xl self-start sm:self-auto">
                <button className="px-4 sm:px-5 py-2 text-[10px] font-bold text-on-primary bg-primary rounded-xl shadow-lg shadow-primary/20 transition-all uppercase tracking-widest">Week</button>
                <button className="px-4 sm:px-5 py-2 text-[10px] font-bold text-secondary hover:text-primary transition-all uppercase tracking-widest">Month</button>
              </div>
            </div>
            
            <div className="flex-1 min-h-[280px] sm:min-h-[400px]">
              {data?.recent_attendance?.length ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={data.recent_attendance}>
                    <defs>
                      <linearGradient id="colorFlow" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#4F60EF" stopOpacity={0.15}/>
                        <stop offset="95%" stopColor="#4F60EF" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="6 6" vertical={false} stroke="#EBEBEB" />
                    <XAxis 
                      dataKey="date" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{fill: '#8E9199', fontSize: 10, fontWeight: 700}} 
                      dy={20} 
                    />
                    <YAxis 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{fill: '#8E9199', fontSize: 10, fontWeight: 700}} 
                      dx={-20} 
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: '#FFFFFF', 
                        borderRadius: '24px', 
                        border: '1px solid rgba(0,0,0,0.05)', 
                        boxShadow: '0 20px 40px rgba(0,0,0,0.08)',
                        padding: '20px'
                      }}
                      itemStyle={{ color: '#1B1B1F', fontWeight: 800 }}
                      labelStyle={{ color: '#4F60EF', fontWeight: 900, marginBottom: '8px', textTransform: 'uppercase', fontSize: '10px', letterSpacing: '0.1em' }}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="present" 
                      stroke="#4F60EF" 
                      strokeWidth={5}
                      fillOpacity={1} 
                      fill="url(#colorFlow)" 
                      animationDuration={2500}
                      dot={{ r: 6, fill: '#FFFFFF', stroke: '#4F60EF', strokeWidth: 3 }}
                      activeDot={{ r: 8, fill: '#4F60EF', stroke: '#FFFFFF', strokeWidth: 3 }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex flex-col items-center justify-center h-full gap-6 text-outline">
                  <div className="w-20 h-20 bg-surface-container-high rounded-full flex items-center justify-center animate-pulse">
                    <Activity size={40} className="text-secondary opacity-30" />
                  </div>
                  <span className="font-bold italic uppercase tracking-widest text-xs">Waiting for data telemetry...</span>
                </div>
              )}
            </div>
          </div>
        </motion.div>

        {/* Quick Actions Section */}
        <motion.div variants={item}>
            <div className="bg-surface-container-lowest h-full flex flex-col rounded-[2rem] sm:rounded-[3rem] border border-outline-variant/60 shadow-sm overflow-hidden">
            <div className="p-6 sm:p-10 border-b border-outline-variant/40">
              <h2 className="text-2xl sm:text-3xl font-black text-on-surface font-headline tracking-tight">Directives</h2>
              <p className="text-secondary font-label text-sm mt-1 font-bold italic opacity-70">Admin Control Center</p>
            </div>
            
            <div className="p-5 sm:p-8 space-y-4 flex-1">
              {[
                { label: 'Register Entity', sub: 'New database entry', path: '/register', icon: Users, bg: 'bg-primary-container/20', color: 'text-primary' },
                { label: 'Class Cluster', sub: 'Manage sessions', path: '/admin/classes', icon: Target, bg: 'bg-tertiary-container/20', color: 'text-tertiary' },
                { label: 'Audit Log', sub: 'Historical records', path: '/history', icon: CalendarDays, bg: 'bg-secondary-container/20', color: 'text-secondary' },
              ].map((action, i) => (
                <Link 
                  key={i}
                  to={action.path}
                  className="flex items-center justify-between p-4 sm:p-6 bg-surface hover:bg-surface-container transition-all group rounded-[1.5rem] sm:rounded-[2rem] border border-outline-variant/30 active:scale-[0.98] shadow-sm hover:shadow-md"
                >
                    <div className="flex items-center gap-4 sm:gap-5 min-w-0">
                      <div className={`w-11 h-11 sm:w-12 sm:h-12 rounded-2xl ${action.bg} ${action.color} flex items-center justify-center transition-transform group-hover:scale-110 shrink-0`}>
                      <action.icon size={24} />
                    </div>
                      <div className="min-w-0">
                      <span className="block font-black text-on-surface text-base tracking-tight">{action.label}</span>
                      <span className="block text-[10px] text-secondary font-bold uppercase tracking-wider opacity-60 font-label">{action.sub}</span>
                    </div>
                  </div>
                    <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center bg-surface-container-high border border-outline-variant/20 -translate-x-1 sm:-translate-x-2 group-hover:translate-x-0 group-hover:bg-primary group-hover:text-on-primary transition-all shrink-0">
                    <ArrowRight size={18} />
                  </div>
                </Link>
              ))}
            </div>

            <div className="p-10 mt-auto">
              <div className="p-8 rounded-[2rem] bg-indigo-50 border border-primary/10 relative overflow-hidden group shadow-inner">
                <div className="absolute top-[-10%] right-[-10%] opacity-[0.05] group-hover:rotate-45 transition-transform duration-1000">
                  <ShieldCheck size={120} className="text-primary" />
                </div>
                <h4 className="font-black text-primary text-xs uppercase tracking-[.25em] mb-3 relative z-10">Neural Sentinel</h4>
                <div className="flex items-center gap-3 relative z-10 bg-white/50 w-fit px-4 py-2 rounded-full border border-white">
                  <div className="w-2.5 h-2.5 rounded-full bg-success shadow-[0_0_10px_#2CB67D] animate-pulse" />
                  <span className="text-[10px] font-black text-on-surface uppercase tracking-widest">Core Engine Validated</span>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}

