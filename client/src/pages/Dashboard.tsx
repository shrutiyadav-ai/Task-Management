import React, { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation } from '@apollo/client';
import {
  BOARDS_QUERY,
  CREATE_BOARD_MUTATION,
  DELETE_BOARD_MUTATION,
  UPDATE_BOARD_MUTATION,
  NOTIFICATIONS_QUERY,
  MARK_NOTIFICATIONS_READ_MUTATION,
  UPDATE_PROFILE_MUTATION,
} from '../graphql/operations';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';
import ConfirmDialog from '../components/ConfirmDialog';
import { Link } from 'react-router-dom';
import {
  LayoutDashboard, Plus, Bell, LogOut, Settings, Check, User,
  Mail, Globe, Search, MoreHorizontal, Pencil, Trash2, X,
  Columns3, ListChecks, Sparkles,
} from 'lucide-react';

// --- Board Context Menu ---
const BoardContextMenu: React.FC<{
  boardId: string;
  boardTitle: string;
  boardDescription: string;
  onEdit: () => void;
  onDelete: () => void;
}> = ({ onEdit, onDelete }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  return (
    <div ref={ref} className="relative z-10">
      <button
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setOpen(!open); }}
        className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition opacity-0 group-hover:opacity-100"
        aria-label="Board options"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <MoreHorizontal className="w-4 h-4" />
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full mt-1 w-36 glass-panel rounded-xl shadow-2xl border border-white/10 py-1 context-menu"
        >
          <button
            role="menuitem"
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); setOpen(false); onEdit(); }}
            className="w-full flex items-center gap-2 px-3 py-2 text-xs text-slate-300 hover:bg-white/5 hover:text-white transition"
          >
            <Pencil className="w-3.5 h-3.5" /> Rename Board
          </button>
          <button
            role="menuitem"
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); setOpen(false); onDelete(); }}
            className="w-full flex items-center gap-2 px-3 py-2 text-xs text-red-400 hover:bg-red-500/10 transition"
          >
            <Trash2 className="w-3.5 h-3.5" /> Delete Board
          </button>
        </div>
      )}
    </div>
  );
};

const Dashboard: React.FC = () => {
  const { user, logout, setUser } = useAuth();
  const { addToast } = useToast();

  // Queries
  const { data: boardsData, loading: boardsLoading, refetch: refetchBoards } = useQuery(BOARDS_QUERY);
  const { data: notifsData, refetch: refetchNotifs } = useQuery(NOTIFICATIONS_QUERY, {
    pollInterval: 10000,
  });

  // Mutations
  const [createBoard] = useMutation(CREATE_BOARD_MUTATION);
  const [deleteBoard] = useMutation(DELETE_BOARD_MUTATION);
  const [updateBoard] = useMutation(UPDATE_BOARD_MUTATION);
  const [markRead] = useMutation(MARK_NOTIFICATIONS_READ_MUTATION);
  const [updateProfile] = useMutation(UPDATE_PROFILE_MUTATION);

  // States
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');

  const [showSettings, setShowSettings] = useState(false);
  const [profileName, setProfileName] = useState(user?.name || '');
  const [profileAvatar, setProfileAvatar] = useState(user?.avatarUrl || '');

  const [boardSearch, setBoardSearch] = useState('');

  // Edit board
  const [editingBoardId, setEditingBoardId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');

  // Delete confirmation
  const [confirmDelete, setConfirmDelete] = useState<{ id: string; title: string } | null>(null);

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
      addToast({ type: 'success', title: 'Board created', message: `"${newTitle.trim()}" is ready to use.` });
    } catch (err) {
      addToast({ type: 'error', title: 'Failed to create board', message: 'Please try again.' });
    }
  };

  const handleDeleteBoard = async () => {
    if (!confirmDelete) return;
    try {
      await deleteBoard({ variables: { id: confirmDelete.id } });
      refetchBoards();
      addToast({ type: 'success', title: 'Board deleted', message: `"${confirmDelete.title}" has been removed.` });
    } catch (err) {
      addToast({ type: 'error', title: 'Failed to delete board' });
    } finally {
      setConfirmDelete(null);
    }
  };

  const handleEditBoard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBoardId || !editTitle.trim()) return;

    try {
      await updateBoard({
        variables: {
          id: editingBoardId,
          title: editTitle.trim(),
          description: editDescription.trim() || null,
        },
      });
      setEditingBoardId(null);
      refetchBoards();
      addToast({ type: 'success', title: 'Board updated' });
    } catch (err) {
      addToast({ type: 'error', title: 'Failed to update board' });
    }
  };

  const handleMarkAllRead = async () => {
    const unreadIds = notifsData?.notifications
      ?.filter((n: any) => !n.isRead)
      .map((n: any) => n.id);

    if (unreadIds && unreadIds.length > 0) {
      await markRead({ variables: { ids: unreadIds } });
      refetchNotifs();
      addToast({ type: 'info', title: 'All notifications marked as read' });
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { data } = await updateProfile({
        variables: {
          name: profileName.trim(),
          avatarUrl: profileAvatar.trim() || null,
        },
      });
      if (data?.updateProfile) {
        setUser(data.updateProfile);
        addToast({ type: 'success', title: 'Profile updated', message: 'Your changes have been saved.' });
      }
    } catch (err) {
      addToast({ type: 'error', title: 'Failed to update profile' });
    }
  };

  const unreadNotifs = notifsData?.notifications?.filter((n: any) => !n.isRead) || [];
  const boards = boardsData?.boards || [];

  // Filter boards by search
  const filteredBoards = boards.filter((b: any) =>
    b.title.toLowerCase().includes(boardSearch.toLowerCase()) ||
    b.description?.toLowerCase().includes(boardSearch.toLowerCase())
  );

  // Stats
  const totalBoards = boards.length;

  // Time-based greeting
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <div className="min-h-screen pb-12" id="main-content">
      {/* Navigation Header */}
      <header className="glass-panel border-b border-white/5 sticky top-0 z-30" role="banner">
        <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between" aria-label="Main navigation">
          <div className="flex items-center gap-2">
            <LayoutDashboard className="w-6 h-6 text-indigo-400" aria-hidden="true" />
            <span className="font-extrabold text-xl text-white tracking-tight">KanbanCollab</span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="p-2 rounded-xl text-slate-300 hover:bg-white/5 transition"
              aria-label="Profile settings"
              aria-pressed={showSettings}
            >
              <Settings className="w-5 h-5" />
            </button>

            <button
              onClick={logout}
              className="p-2 rounded-xl text-slate-300 hover:bg-red-500/10 hover:text-red-400 transition"
              aria-label="Sign out"
            >
              <LogOut className="w-5 h-5" />
            </button>

            <div className="h-8 w-[1px] bg-white/10" aria-hidden="true" />

            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-indigo-500 to-pink-500 flex items-center justify-center font-bold text-white text-sm shadow shadow-indigo-500/30" aria-hidden="true">
                {user?.name.charAt(0).toUpperCase()}
              </div>
              <span className="text-sm font-semibold text-slate-200 hidden md:block">{user?.name}</span>
            </div>
          </div>
        </nav>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8">
        {/* Welcome Hero */}
        <section className="mb-10 animate-slide-up" aria-label="Welcome">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div>
              <h2 className="text-3xl font-black text-white tracking-tight flex items-center gap-2">
                {getGreeting()}, {user?.name?.split(' ')[0]}
                <Sparkles className="w-6 h-6 text-amber-400" aria-hidden="true" />
              </h2>
              <p className="text-slate-400 text-sm mt-1">
                {totalBoards === 0
                  ? 'Create your first board to get started.'
                  : `You have ${totalBoards} board${totalBoards !== 1 ? 's' : ''} · ${unreadNotifs.length} unread notification${unreadNotifs.length !== 1 ? 's' : ''}`}
              </p>
            </div>
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-1.5 px-5 py-2.5 bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 rounded-xl font-bold text-sm text-white shadow-lg shadow-indigo-500/20 active:scale-[0.98] transition-all whitespace-nowrap"
              aria-label="Create a new board"
            >
              <Plus className="w-4 h-4" /> Create Board
            </button>
          </div>
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Left Columns - Settings & Boards */}
          <div className="lg:col-span-3 space-y-8">
            {/* Settings Panel */}
            {showSettings && (
              <section className="glass-panel p-6 rounded-2xl relative overflow-hidden animate-slide-up" aria-label="Profile settings">
                <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                  <Settings className="w-5 h-5 text-indigo-400" aria-hidden="true" /> Profile Settings
                </h2>
                <form onSubmit={handleUpdateProfile} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs text-slate-400 font-semibold uppercase block">Email Address</label>
                      <div className="flex items-center gap-2 pl-3 py-2.5 rounded-xl glass-input opacity-65 text-sm">
                        <Mail className="w-4 h-4 text-slate-400" aria-hidden="true" />
                        <span>{user?.email}</span>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label htmlFor="settings-name" className="text-xs text-slate-400 font-semibold uppercase block">Display Name</label>
                      <input
                        id="settings-name"
                        type="text"
                        required
                        value={profileName}
                        onChange={(e) => setProfileName(e.target.value)}
                        className="w-full pl-3 pr-4 py-2.5 rounded-xl glass-input text-sm"
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label htmlFor="settings-avatar" className="text-xs text-slate-400 font-semibold uppercase block">Avatar URL (Optional)</label>
                    <input
                      id="settings-avatar"
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
              </section>
            )}

            {/* Edit Board Inline */}
            {editingBoardId && (
              <section className="glass-panel p-6 rounded-2xl animate-scale-in" aria-label="Edit board">
                <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                  <Pencil className="w-4 h-4 text-indigo-400" aria-hidden="true" /> Edit Board
                </h3>
                <form onSubmit={handleEditBoard} className="space-y-4">
                  <div className="space-y-1">
                    <label htmlFor="edit-board-title" className="text-xs text-slate-300 font-semibold uppercase block">Board Title</label>
                    <input
                      id="edit-board-title"
                      type="text"
                      required
                      autoFocus
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      className="w-full pl-3 pr-4 py-2.5 rounded-xl glass-input text-sm"
                    />
                  </div>
                  <div className="space-y-1">
                    <label htmlFor="edit-board-desc" className="text-xs text-slate-300 font-semibold uppercase block">Description</label>
                    <textarea
                      id="edit-board-desc"
                      value={editDescription}
                      onChange={(e) => setEditDescription(e.target.value)}
                      rows={2}
                      className="w-full pl-3 pr-4 py-2.5 rounded-xl glass-input text-sm resize-none"
                    />
                  </div>
                  <div className="flex justify-end gap-3">
                    <button type="button" onClick={() => setEditingBoardId(null)} className="px-4 py-2 bg-white/5 hover:bg-white/10 rounded-xl font-semibold text-sm text-slate-300 transition">Cancel</button>
                    <button type="submit" className="px-4 py-2 bg-indigo-500 hover:bg-indigo-600 rounded-xl font-semibold text-sm text-white transition">Save</button>
                  </div>
                </form>
              </section>
            )}

            {/* Boards Grid */}
            <section aria-label="Your boards">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
                <h2 className="text-2xl font-black text-white tracking-tight">Your Boards</h2>

                {/* Board Search */}
                {boards.length > 0 && (
                  <div className="search-bar flex items-center gap-2 px-3 py-1.5 rounded-xl w-full sm:w-64">
                    <Search className="w-4 h-4 text-slate-400 shrink-0" aria-hidden="true" />
                    <input
                      type="search"
                      value={boardSearch}
                      onChange={(e) => setBoardSearch(e.target.value)}
                      placeholder="Search boards..."
                      aria-label="Search boards"
                      className="bg-transparent border-none outline-none text-sm text-white placeholder:text-slate-500 w-full"
                    />
                    {boardSearch && (
                      <button onClick={() => setBoardSearch('')} className="text-slate-400 hover:text-white transition" aria-label="Clear search">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                )}
              </div>

              {boardsLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {[1, 2, 3].map((n) => (
                    <div key={n} className="h-40 rounded-2xl skeleton" />
                  ))}
                </div>
              ) : filteredBoards.length === 0 && boards.length > 0 ? (
                <div className="glass-panel p-8 rounded-2xl text-center">
                  <Search className="w-8 h-8 text-slate-500 mx-auto mb-3" aria-hidden="true" />
                  <p className="text-slate-400 text-sm">No boards match "{boardSearch}"</p>
                </div>
              ) : boards.length === 0 ? (
                <div className="glass-panel p-12 rounded-2xl text-center">
                  <div className="inline-flex p-4 rounded-full bg-white/5 mb-4 text-indigo-400">
                    <LayoutDashboard className="w-8 h-8" aria-hidden="true" />
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
                  {filteredBoards.map((board: any, index: number) => (
                    <Link
                      key={board.id}
                      to={`/board/${board.id}`}
                      className="glass-card board-card-glow p-6 rounded-2xl h-44 flex flex-col justify-between group relative"
                      style={{ animationDelay: `${index * 60}ms` }}
                      aria-label={`Open board: ${board.title}`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0 pr-2">
                          <h3 className="font-bold text-white text-lg group-hover:text-indigo-400 transition-colors truncate">
                            {board.title}
                          </h3>
                          <p className="text-slate-400 text-xs mt-1.5 line-clamp-2">{board.description || 'No description'}</p>
                        </div>
                        <BoardContextMenu
                          boardId={board.id}
                          boardTitle={board.title}
                          boardDescription={board.description || ''}
                          onEdit={() => {
                            setEditingBoardId(board.id);
                            setEditTitle(board.title);
                            setEditDescription(board.description || '');
                          }}
                          onDelete={() => setConfirmDelete({ id: board.id, title: board.title })}
                        />
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-slate-500 uppercase tracking-wider font-semibold">
                        <span>Created {new Date(board.createdAt).toLocaleDateString()}</span>
                        {board.isPublic ? (
                          <span className="flex items-center gap-1 text-green-400">
                            <Globe className="w-3 h-3" aria-hidden="true" /> Public
                          </span>
                        ) : (
                          <span>Private</span>
                        )}
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </section>
          </div>

          {/* Right Column - Live Notifications Center */}
          <aside className="space-y-6" aria-label="Notifications panel">
            <div className="glass-panel p-6 rounded-2xl flex flex-col h-[500px]">
              <div className="flex items-center justify-between border-b border-white/5 pb-4 mb-4">
                <h3 className="font-bold text-white text-lg flex items-center gap-2">
                  <Bell className="w-5 h-5 text-pink-400" aria-hidden="true" /> Notifications
                  {unreadNotifs.length > 0 && (
                    <span className="text-[10px] bg-pink-500 text-white font-extrabold px-1.5 py-0.5 rounded-full" aria-label={`${unreadNotifs.length} unread`}>
                      {unreadNotifs.length}
                    </span>
                  )}
                </h3>
                {unreadNotifs.length > 0 && (
                  <button
                    onClick={handleMarkAllRead}
                    className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold transition"
                  >
                    Mark all read
                  </button>
                )}
              </div>

              <div className="flex-1 overflow-y-auto space-y-3 pr-1" aria-live="polite" aria-label="Notification list">
                {notifsData?.notifications?.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center text-slate-500 text-sm">
                    <Bell className="w-8 h-8 opacity-20 mb-2" aria-hidden="true" />
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
                        <div className="absolute top-3 right-3 w-1.5 h-1.5 bg-indigo-400 rounded-full presence-dot" aria-hidden="true" />
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
          </aside>
        </div>
      </main>

      {/* Create Board Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm modal-overlay" onClick={() => setShowCreateModal(false)} role="presentation">
          <div
            className="w-full max-w-md glass-panel p-6 rounded-2xl relative shadow-2xl modal-content"
            role="dialog"
            aria-modal="true"
            aria-labelledby="create-board-title"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 id="create-board-title" className="text-xl font-bold text-white mb-4">Create New Board</h3>
            <form onSubmit={handleCreateBoard} className="space-y-4">
              <div className="space-y-1">
                <label htmlFor="new-board-title" className="text-xs text-slate-300 font-semibold uppercase block">Board Title</label>
                <input
                  id="new-board-title"
                  type="text"
                  required
                  autoFocus
                  placeholder="e.g. Q3 Roadmap"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full pl-3 pr-4 py-2.5 rounded-xl glass-input text-sm"
                />
              </div>
              <div className="space-y-1">
                <label htmlFor="new-board-desc" className="text-xs text-slate-300 font-semibold uppercase block">Description (Optional)</label>
                <textarea
                  id="new-board-desc"
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
                  onClick={() => { setShowCreateModal(false); setNewTitle(''); setNewDescription(''); }}
                  className="px-4 py-2 bg-white/5 hover:bg-white/10 rounded-xl font-semibold text-sm text-slate-300 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-500 hover:bg-indigo-600 rounded-xl font-semibold text-sm text-white transition shadow-lg shadow-indigo-500/20"
                >
                  Create Board
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={!!confirmDelete}
        title="Delete Board"
        message={`Are you sure you want to delete "${confirmDelete?.title}"? This action cannot be undone and will remove all columns, tasks, and comments.`}
        confirmLabel="Delete Board"
        variant="danger"
        onConfirm={handleDeleteBoard}
        onCancel={() => setConfirmDelete(null)}
      />
    </div>
  );
};

export default Dashboard;
