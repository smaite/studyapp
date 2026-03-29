import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { 
  Trophy, Medal, Crown, ArrowLeft, Users, Wifi, 
  TrendingUp, Star, Flame, RefreshCw, Loader2,
  ChevronUp, ChevronDown, Minus
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

// Rank badges with icons and colors
const RANK_BADGES = [
  { rank: 1, icon: Crown, color: 'text-yellow-400', bg: 'bg-yellow-500/20', border: 'border-yellow-500/30' },
  { rank: 2, icon: Medal, color: 'text-gray-300', bg: 'bg-gray-400/20', border: 'border-gray-400/30' },
  { rank: 3, icon: Medal, color: 'text-amber-600', bg: 'bg-amber-600/20', border: 'border-amber-600/30' },
]

// Level calculation from XP
const getLevel = (xp) => {
  if (xp < 100) return { level: 1, title: 'Newbie', color: 'text-gray-400' }
  if (xp < 300) return { level: 2, title: 'Learner', color: 'text-green-400' }
  if (xp < 600) return { level: 3, title: 'Student', color: 'text-blue-400' }
  if (xp < 1000) return { level: 4, title: 'Scholar', color: 'text-purple-400' }
  if (xp < 1500) return { level: 5, title: 'Expert', color: 'text-pink-400' }
  if (xp < 2500) return { level: 6, title: 'Master', color: 'text-amber-400' }
  if (xp < 4000) return { level: 7, title: 'Grandmaster', color: 'text-red-400' }
  return { level: 8, title: 'Legend', color: 'text-yellow-400' }
}

// Format large numbers
const formatXP = (xp) => {
  if (xp >= 1000000) return `${(xp / 1000000).toFixed(1)}M`
  if (xp >= 1000) return `${(xp / 1000).toFixed(1)}K`
  return xp.toString()
}

// Get user initials
const getInitials = (name) => {
  if (!name) return '?'
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
}

// Get avatar color based on name
const getAvatarColor = (name) => {
  const colors = [
    'from-purple-500 to-pink-500',
    'from-blue-500 to-cyan-500',
    'from-green-500 to-emerald-500',
    'from-orange-500 to-red-500',
    'from-indigo-500 to-purple-500',
    'from-pink-500 to-rose-500',
    'from-teal-500 to-green-500',
    'from-amber-500 to-orange-500',
  ]
  const hash = (name || '').split('').reduce((a, b) => a + b.charCodeAt(0), 0)
  return colors[hash % colors.length]
}

export default function Leaderboard() {
  const navigate = useNavigate()
  const { user } = useAuth()
  
  const [leaderboard, setLeaderboard] = useState([])
  const [onlineUsers, setOnlineUsers] = useState(new Set())
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [userRank, setUserRank] = useState(null)
  const [filter, setFilter] = useState('all') // all, weekly, daily
  const [totalOnline, setTotalOnline] = useState(0)

  // Fetch leaderboard data
  const fetchLeaderboard = useCallback(async () => {
    try {
      // Fetch user progress with display_name
      const { data: progressData, error } = await supabase
        .from('user_progress')
        .select('user_id, display_name, xp, streak, total_correct, total_answered, updated_at')
        .order('xp', { ascending: false })
        .limit(100)

      if (error) throw error

      // Map to leaderboard format
      const leaderboardData = progressData.map((entry, index) => ({
        id: entry.user_id,
        rank: index + 1,
        xp: entry.xp || 0,
        streak: entry.streak || 0,
        accuracy: entry.total_answered > 0 
          ? Math.round((entry.total_correct / entry.total_answered) * 100) 
          : 0,
        lastActive: entry.updated_at,
        name: entry.display_name || null,
      }))

      setLeaderboard(leaderboardData)

      // Find current user's rank
      if (user) {
        const myRank = leaderboardData.find(e => e.id === user.id)
        if (myRank) {
          // Use user's actual name if available
          myRank.name = myRank.name || user.user_metadata?.full_name || user.email?.split('@')[0]
          setUserRank(myRank)
        } else {
          // User not in top 100, fetch their rank
          const { count } = await supabase
            .from('user_progress')
            .select('*', { count: 'exact', head: true })
            .gt('xp', 0)
          
          const { data: myProgress } = await supabase
            .from('user_progress')
            .select('xp, streak, total_correct, total_answered, display_name')
            .eq('user_id', user.id)
            .single()

          if (myProgress) {
            const { count: higherCount } = await supabase
              .from('user_progress')
              .select('*', { count: 'exact', head: true })
              .gt('xp', myProgress.xp || 0)

            setUserRank({
              id: user.id,
              rank: (higherCount || 0) + 1,
              xp: myProgress.xp || 0,
              streak: myProgress.streak || 0,
              accuracy: myProgress.total_answered > 0
                ? Math.round((myProgress.total_correct / myProgress.total_answered) * 100)
                : 0,
              name: myProgress.display_name || user.user_metadata?.full_name || user.email?.split('@')[0],
            })
          }
        }
      }
    } catch (err) {
      console.error('Failed to fetch leaderboard:', err)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [user])

  // Setup presence tracking
  useEffect(() => {
    if (!user) return

    const channel = supabase.channel('online-users', {
      config: {
        presence: {
          key: user.id,
        },
      },
    })

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState()
        const online = new Set(Object.keys(state))
        setOnlineUsers(online)
        setTotalOnline(online.size)
      })
      .on('presence', { event: 'join' }, ({ key, newPresences }) => {
        setOnlineUsers(prev => new Set([...prev, key]))
        setTotalOnline(prev => prev + 1)
      })
      .on('presence', { event: 'leave' }, ({ key }) => {
        setOnlineUsers(prev => {
          const next = new Set(prev)
          next.delete(key)
          return next
        })
        setTotalOnline(prev => Math.max(0, prev - 1))
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({
            user_id: user.id,
            name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'Anonymous',
            online_at: new Date().toISOString(),
          })
        }
      })

    return () => {
      channel.unsubscribe()
    }
  }, [user])

  // Initial fetch
  useEffect(() => {
    fetchLeaderboard()
  }, [fetchLeaderboard])

  // Refresh handler
  const handleRefresh = () => {
    setRefreshing(true)
    fetchLeaderboard()
  }

  // Render rank badge
  const RankBadge = ({ rank }) => {
    const badge = RANK_BADGES.find(b => b.rank === rank)
    if (badge) {
      const Icon = badge.icon
      return (
        <div className={`w-10 h-10 rounded-full ${badge.bg} ${badge.border} border flex items-center justify-center`}>
          <Icon className={`h-5 w-5 ${badge.color}`} />
        </div>
      )
    }
    return (
      <div className="w-10 h-10 rounded-full bg-surface-700 flex items-center justify-center">
        <span className="text-sm font-bold text-gray-400">#{rank}</span>
      </div>
    )
  }

  // Leaderboard row component
  const LeaderboardRow = ({ entry, isCurrentUser }) => {
    const level = getLevel(entry.xp)
    const isOnline = onlineUsers.has(entry.id)
    const displayName = entry.name || `User ${entry.id.slice(0, 6)}`
    
    return (
      <div 
        className={`flex items-center gap-3 p-3 rounded-xl transition-all ${
          isCurrentUser 
            ? 'bg-primary-500/20 border border-primary-500/30' 
            : 'bg-surface-800/60 hover:bg-surface-700/60'
        }`}
      >
        {/* Rank */}
        <RankBadge rank={entry.rank} />
        
        {/* Avatar */}
        <div className="relative">
          <div className={`w-11 h-11 rounded-full bg-gradient-to-br ${getAvatarColor(displayName)} flex items-center justify-center text-white font-bold text-sm`}>
            {getInitials(displayName)}
          </div>
          {/* Online indicator */}
          {isOnline && (
            <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-green-500 rounded-full border-2 border-surface-800" />
          )}
        </div>
        
        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className={`font-semibold truncate ${isCurrentUser ? 'text-primary-300' : 'text-white'}`}>
              {displayName}
              {isCurrentUser && <span className="text-xs text-primary-400 ml-1">(You)</span>}
            </span>
          </div>
          <div className="flex items-center gap-3 text-xs text-gray-500">
            <span className={level.color}>{level.title}</span>
            {entry.streak > 0 && (
              <span className="flex items-center gap-1 text-orange-400">
                <Flame className="h-3 w-3" /> {entry.streak}d
              </span>
            )}
            {entry.accuracy > 0 && (
              <span className="flex items-center gap-1">
                <TrendingUp className="h-3 w-3" /> {entry.accuracy}%
              </span>
            )}
          </div>
        </div>
        
        {/* XP */}
        <div className="text-right">
          <div className="flex items-center gap-1 text-amber-400 font-bold">
            <Star className="h-4 w-4 fill-current" />
            <span>{formatXP(entry.xp)}</span>
          </div>
          <span className="text-xs text-gray-500">XP</span>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a12] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary-500" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0a0a12] text-white">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-surface-900/95 backdrop-blur-sm border-b border-white/5">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => navigate('/exam-prep')}
              className="p-2 hover:bg-white/5 rounded-lg transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div className="flex items-center gap-2">
              <Trophy className="h-6 w-6 text-amber-400" />
              <h1 className="text-xl font-bold">Leaderboard</h1>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {/* Online count */}
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-green-500/10 text-green-400 rounded-full text-sm">
              <Wifi className="h-4 w-4" />
              <span>{totalOnline} online</span>
            </div>
            
            {/* Refresh */}
            <button 
              onClick={handleRefresh}
              disabled={refreshing}
              className="p-2 hover:bg-white/5 rounded-lg transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`h-5 w-5 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-4 pb-24">
        {/* User's rank card (if not in top 10) */}
        {userRank && userRank.rank > 10 && (
          <div className="mb-4">
            <p className="text-xs text-gray-500 mb-2 uppercase tracking-wider">Your Position</p>
            <LeaderboardRow entry={userRank} isCurrentUser={true} />
          </div>
        )}

        {/* Stats summary */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="bg-surface-800/60 rounded-xl p-3 text-center">
            <div className="flex items-center justify-center gap-1 text-amber-400 mb-1">
              <Trophy className="h-4 w-4" />
            </div>
            <p className="text-lg font-bold text-white">{leaderboard.length}</p>
            <p className="text-xs text-gray-500">Players</p>
          </div>
          <div className="bg-surface-800/60 rounded-xl p-3 text-center">
            <div className="flex items-center justify-center gap-1 text-green-400 mb-1">
              <Wifi className="h-4 w-4" />
            </div>
            <p className="text-lg font-bold text-white">{totalOnline}</p>
            <p className="text-xs text-gray-500">Online Now</p>
          </div>
          <div className="bg-surface-800/60 rounded-xl p-3 text-center">
            <div className="flex items-center justify-center gap-1 text-purple-400 mb-1">
              <Star className="h-4 w-4" />
            </div>
            <p className="text-lg font-bold text-white">
              {userRank ? `#${userRank.rank}` : '-'}
            </p>
            <p className="text-xs text-gray-500">Your Rank</p>
          </div>
        </div>

        {/* Top 3 podium */}
        {leaderboard.length >= 3 && (
          <div className="flex items-end justify-center gap-2 mb-6 px-4">
            {/* 2nd place */}
            <div className="flex-1 max-w-[110px]">
              <div className="bg-surface-800/80 rounded-xl p-3 text-center border border-gray-500/20">
                <div className={`w-14 h-14 mx-auto rounded-full bg-gradient-to-br ${getAvatarColor(leaderboard[1]?.name || '')} flex items-center justify-center text-white font-bold mb-2 relative`}>
                  {getInitials(leaderboard[1]?.name || 'U')}
                  {onlineUsers.has(leaderboard[1]?.id) && (
                    <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-green-500 rounded-full border-2 border-surface-800" />
                  )}
                </div>
                <Medal className="h-5 w-5 text-gray-300 mx-auto mb-1" />
                <p className="text-sm font-semibold text-white truncate">{leaderboard[1]?.name || `User ${leaderboard[1]?.id.slice(0, 4)}`}</p>
                <p className="text-xs text-amber-400 font-bold">{formatXP(leaderboard[1]?.xp || 0)} XP</p>
              </div>
              <div className="h-16 bg-gray-500/20 rounded-b-xl -mt-1" />
            </div>
            
            {/* 1st place */}
            <div className="flex-1 max-w-[120px] -mb-4">
              <div className="bg-surface-800/80 rounded-xl p-4 text-center border border-yellow-500/30 shadow-lg shadow-yellow-500/10">
                <div className={`w-16 h-16 mx-auto rounded-full bg-gradient-to-br ${getAvatarColor(leaderboard[0]?.name || '')} flex items-center justify-center text-white font-bold text-lg mb-2 relative ring-2 ring-yellow-500/50`}>
                  {getInitials(leaderboard[0]?.name || 'U')}
                  {onlineUsers.has(leaderboard[0]?.id) && (
                    <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-green-500 rounded-full border-2 border-surface-800" />
                  )}
                </div>
                <Crown className="h-6 w-6 text-yellow-400 mx-auto mb-1" />
                <p className="text-sm font-bold text-white truncate">{leaderboard[0]?.name || `User ${leaderboard[0]?.id.slice(0, 4)}`}</p>
                <p className="text-sm text-amber-400 font-bold">{formatXP(leaderboard[0]?.xp || 0)} XP</p>
              </div>
              <div className="h-24 bg-yellow-500/20 rounded-b-xl -mt-1" />
            </div>
            
            {/* 3rd place */}
            <div className="flex-1 max-w-[110px]">
              <div className="bg-surface-800/80 rounded-xl p-3 text-center border border-amber-600/20">
                <div className={`w-14 h-14 mx-auto rounded-full bg-gradient-to-br ${getAvatarColor(leaderboard[2]?.name || '')} flex items-center justify-center text-white font-bold mb-2 relative`}>
                  {getInitials(leaderboard[2]?.name || 'U')}
                  {onlineUsers.has(leaderboard[2]?.id) && (
                    <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-green-500 rounded-full border-2 border-surface-800" />
                  )}
                </div>
                <Medal className="h-5 w-5 text-amber-600 mx-auto mb-1" />
                <p className="text-sm font-semibold text-white truncate">{leaderboard[2]?.name || `User ${leaderboard[2]?.id.slice(0, 4)}`}</p>
                <p className="text-xs text-amber-400 font-bold">{formatXP(leaderboard[2]?.xp || 0)} XP</p>
              </div>
              <div className="h-12 bg-amber-600/20 rounded-b-xl -mt-1" />
            </div>
          </div>
        )}

        {/* Rest of leaderboard */}
        <div className="space-y-2">
          <p className="text-xs text-gray-500 uppercase tracking-wider mb-3">Rankings</p>
          {leaderboard.slice(3).map((entry) => (
            <LeaderboardRow 
              key={entry.id} 
              entry={entry} 
              isCurrentUser={user?.id === entry.id}
            />
          ))}
          
          {leaderboard.length === 0 && (
            <div className="text-center py-12">
              <Users className="h-12 w-12 text-gray-600 mx-auto mb-3" />
              <p className="text-gray-400">No players on the leaderboard yet</p>
              <p className="text-sm text-gray-500 mt-1">Start learning to earn XP!</p>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
