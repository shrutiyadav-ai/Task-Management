import React, { useState } from 'react';
import { useQuery, useMutation } from '@apollo/client';
import { BOARDS_QUERY, CREATE_BOARD_MUTATION, NOTIFICATIONS_QUERY, MARK_NOTIFICATIONS_READ_MUTATION, UPDATE_PROFILE_MUTATION } from '../graphql/operations';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import { LayoutDashboard, Plus, Bell, LogOut, Settings, Check, User, Mail, Globe, ShieldAlert } from 'lucide-react';

const Dashboard: React.FC = () => {
  const { user, logout, setUser } = useAuth();
  
  // Queries
  const { data: boardsData, loading: boardsLoading, refetch: refetchBoards } = useQuery(BOARDS_QUERY);
  const { data: notifsData, refetch: refetchNotifs } = useQuery(NOTIFICATIONS_QUERY, {
    pollInterval: 10000, // Poll notifications every 10s
  });

  // Mutations
  const [createBoard] = useMutation(CREATE_BOARD_MUTATION);
  const [markRead] = useMutation(MARK_NOTIFICATIONS_READ_MUTATION);
  const [updateProfile] = useMutation(UPDATE_PROFILE_MUTATION);

  // States
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  
  const [showSettings, setShowSettings] = useState(false);
  const [profileName, setProfileName] = useState(user?.name || '');
  const [profileAvatar, setProfileAvatar] = useState(user?.avatarUrl || '');
  const [profileMsg, setProfileMsg] = useState('');

  const handleCreateBoard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    try {
      await createBoard({
        variables: {
          title: newTitle.trim(),
          description: newDescription.trim() || undefined,
        },
      });
      setNewTitle('');
      setNewDescription('');
      setShowCreateModal(false);
      refetchBoards();
    } catch (err) {
      console.error(err);
    }
  };

  const handleMarkAllRead = async () => {
    const unreadIds = notifsData?.notifications
      ?.filter((n: any) => !n.isRead)
      .map((n: any) => n.id);

    if (unreadIds && unreadIds.length > 0) {
      await markRead({
        variables: { ids: unreadIds },
      });
      refetchNotifs();
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileMsg('');
    try {
      const { data } = await updateProfile({
        variables: {
          name: profileName.trim(),
          avatarUrl: profileAvatar.trim() || null,
        },
      });
      if (data?.updateProfile) {
        setUser(data.updateProfile);
        setProfileMsg('Profile updated successfully!');
      }
    } catch (err) {
      setProfileMsg('Error updating profile.');
    }
  };

  const unreadNotifs = notifsData?.notifications?.filter((n: any) => !n.isRead) || [];

  return (
    <div className="min-h-screen pb-12">
      {/* Navigation Header */}
      <header className="glass-panel border-b border-white/5 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <LayoutDashboard className="w-6 h-6 text-indigo-400" />
            <span className="font-extrabold text-xl text-white tracking-tight">KanbanCollab</span>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="p-2 rounded-xl text-slate-300 hover:bg-white/5 transition"
              title="Settings"
            >
              <Settings className="w-5 h-5" />
            </button>
            
            <button
              onClick={logout}
              className="p-2 rounded-xl text-slate-300 hover:bg-red-500/10 hover:text-red-400 transition"
              title="Sign Out"
            >
              <LogOut className="w-5 h-5" />
            </button>

            <div className="h-8 w-[1px] bg-white/10"></div>

            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-indigo-500 to-pink-500 flex items-center justify-center font-bold text-white text-sm shadow shadow-indigo-500/30">
                {user?.name.charAt(0).toUpperCase()}
              </div>
              <span className="text-sm font-semibold text-slate-200 hidden md:block">{user?.name}</span>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-10 grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Left Columns - Boards & Settings */}
        <div className="lg:col-span-3 space-y-8">
          {showSettings ? (
            <div className="glass-panel p-6 rounded-2xl relative overflow-hidden">
              <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                <Settings className="w-5 h-5 text-indigo-400" /> Profile Settings
              </h2>
              {profileMsg && (
                <div className="mb-4 text-xs font-semibold p-2 bg-indigo-950/40 border border-indigo-500/30 rounded-lg text-indigo-300">
                  {profileMsg}
                </div>
              )}
              <form onSubmit={handleUpdateProfile} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs text-slate-400 font-semibold uppercase">Email Address</label>
                    <div className="flex items-center gap-2 pl-3 py-2.5 rounded-xl glass-input opacity-65 text-sm">
                      <Mail className="w-4 h-4 text-slate-400" />
                      <span>{user?.email}</span>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-slate-400 font-semibold uppercase">Display Name</label>
                    <input
                      type="text"
                      required
                      value={profileName}
                      onChange={(e) => setProfileName(e.target.value)}
                      className="w-full pl-3 pr-4 py-2.5 rounded-xl glass-input text-sm"
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-slate-400 font-semibold uppercase">Avatar URL (Optional)</label>
                  <input
                    type="url"
                    placeholder="https://example.com/avatar.jpg"
                    value={profileAvatar}
                    onChange={(e) => setProfileAvatar(e.target.value)}
                    className="w-full pl-3 pr-4 py-2.5 rounded-xl glass-input text-sm"
                  />
                </div>
                <div className="flex gap-3 pt-2">
                  <button
                    type="submit"
                    className="px-5 py-2.5 rounded-xl bg-indigo-500 hover:bg-indigo-600 font-semibold text-sm text-white transition"
                  >
                    Save Changes
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowSettings(false)}
                    className="px-5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 font-semibold text-sm text-slate-300 transition"
                  >
                    Close
                  </button>
                </div>
              </form>
            </div>
          ) : null}

          {/* Boards Grid */}
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-black text-white tracking-tight">Your Boards</h2>
              <button
                onClick={() => setShowCreateModal(true)}
                className="flex items-center gap-1.5 px-4 py-2 bg-indigo-500 hover:bg-indigo-600 rounded-xl font-bold text-sm text-white shadow-lg shadow-indigo-500/20 active:scale-98 transition"
              >
                <Plus className="w-4 h-4" /> Create Board
              </button>
            </div>

            {boardsLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[1, 2, 3].map((n) => (
                  <div key={n} className="h-32 rounded-2xl glass-card animate-pulse-slow"></div>
                ))}
              </div>
            ) : boardsData?.boards?.length === 0 ? (
              <div className="glass-panel p-12 rounded-2xl text-center">
                <div className="inline-flex p-4 rounded-full bg-white/5 mb-4 text-indigo-400">
                  <LayoutDashboard className="w-8 h-8" />
                </div>
                <h3 className="text-lg font-bold text-white mb-2">No boards yet</h3>
                <p className="text-slate-400 text-sm max-w-sm mx-auto mb-6">
                  Get started by creating your first collaborative Kanban board to manage tasks and coordinate team operations.
                </p>
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="px-5 py-2.5 bg-indigo-500 hover:bg-indigo-600 rounded-xl font-bold text-sm text-white shadow transition"
                >
                  Create Board
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {boardsData?.boards?.map((board: any) => (
                  <Link
                    key={board.id}
                    to={`/board/${board.id}`}
                    className="glass-card p-6 rounded-2xl h-36 flex flex-col justify-between group relative overflow-hidden"
                  >
                    {/* Glowing highlight indicator */}
                    <div className="absolute top-0 left-0 w-2 h-full bg-indigo-500 rounded-l-2xl transform scale-y-0 group-hover:scale-y-100 transition-transform origin-top duration-300"></div>
                    <div>
                      <h3 className="font-bold text-white text-lg group-hover:text-indigo-400 transition-colors">
                        {board.title}
                      </h3>
                      <p className="text-slate-400 text-xs mt-1.5 line-clamp-2">{board.description || 'No description'}</p>
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-slate-500 uppercase tracking-wider font-semibold">
                      <span>Created {new Date(board.createdAt).toLocaleDateString()}</span>
                      {board.isPublic ? (
                        <span className="flex items-center gap-1 text-green-400">
                          <Globe className="w-3 h-3" /> Public
                        </span>
                      ) : (
                        <span>Private</span>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column - Live Notifications Center */}
        <div className="space-y-6">
          <div className="glass-panel p-6 rounded-2xl flex flex-col h-[500px]">
            <div className="flex items-center justify-between border-b border-white/5 pb-4 mb-4">
              <h3 className="font-bold text-white text-lg flex items-center gap-2">
                <Bell className="w-5 h-5 text-pink-400" /> Notifications
                {unreadNotifs.length > 0 && (
                  <span className="text-[10px] bg-pink-500 text-white font-extrabold px-1.5 py-0.5 rounded-full">
                    {unreadNotifs.length}
                  </span>
                )}
              </h3>
              {unreadNotifs.length > 0 && (
                <button
                  onClick={handleMarkAllRead}
                  className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold"
                >
                  Mark all read
                </button>
              )}
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 pr-1">
              {notifsData?.notifications?.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center text-slate-500 text-sm">
                  <Bell className="w-8 h-8 opacity-20 mb-2" />
                  <span>No notifications</span>
                </div>
              ) : (
                notifsData?.notifications?.map((notif: any) => (
                  <div
                    key={notif.id}
                    className={`p-3 rounded-xl border text-xs transition relative ${
                      notif.isRead
                        ? 'bg-transparent border-white/5 text-slate-400'
                        : 'bg-indigo-950/20 border-indigo-500/20 text-slate-200'
                    }`}
                  >
                    {!notif.isRead && (
                      <div className="absolute top-3 right-3 w-1.5 h-1.5 bg-indigo-400 rounded-full"></div>
                    )}
                    <p className="font-medium pr-3 leading-relaxed">{notif.message}</p>
                    <div className="mt-2 flex items-center justify-between text-[10px] text-slate-500">
                      <span>{new Date(notif.createdAt).toLocaleTimeString()}</span>
                      {notif.link && (
                        <Link to={notif.link} className="text-indigo-400 hover:underline">
                          View Task
                        </Link>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Create Board Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md glass-panel p-6 rounded-2xl relative shadow-2xl animate-pulse-slow">
            <h3 className="text-xl font-bold text-white mb-4">Create New Board</h3>
            <form onSubmit={handleCreateBoard} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs text-slate-300 font-semibold uppercase">Board Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Q3 Roadmap"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full pl-3 pr-4 py-2.5 rounded-xl glass-input text-sm"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-slate-300 font-semibold uppercase">Description (Optional)</label>
                <textarea
                  placeholder="Describe board purpose..."
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  rows={3}
                  className="w-full pl-3 pr-4 py-2.5 rounded-xl glass-input text-sm resize-none"
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false);
                    setNewTitle('');
                    setNewDescription('');
                  }}
                  className="px-4 py-2 bg-white/5 hover:bg-white/10 rounded-xl font-semibold text-sm text-slate-300 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-500 hover:bg-indigo-600 rounded-xl font-semibold text-sm text-white transition"
                >
                  Create Board
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
