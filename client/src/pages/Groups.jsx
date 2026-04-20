import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users, Plus, Copy, ExternalLink, ArrowLeft, X, Trash2,
  BookOpen, UserPlus, LogOut, RefreshCw, Link2, MessageSquare,
  Settings, Shield, Hash, Search, ChevronDown, Ban, Check, Pencil, Upload, ImagePlus
} from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useChatInbox } from '../context/ChatInboxContext';
import { connectSocket, getSocket } from '../services/socket';
import toast from 'react-hot-toast';
import Navbar from '../components/Navbar';
import ConfirmDialog from '../components/ConfirmDialog';
import MessageList from '../components/chat/MessageList';
import ChatInput from '../components/chat/ChatInput';
import TypingIndicator from '../components/chat/TypingIndicator';

const ROLE_PERMISSION_OPTIONS = [
  { key: 'sendMessages', label: 'Отправка сообщений' },
  { key: 'deleteMessages', label: 'Удаление сообщений' },
  { key: 'kickMembers', label: 'Выгонять участников' },
  { key: 'banMembers', label: 'Банить участников' },
  { key: 'manageRoles', label: 'Управлять ролями' },
  { key: 'manageGroup', label: 'Управлять группой' },
  { key: 'assignTests', label: 'Назначать тесты' },
  { key: 'pinMessages', label: 'Закреплять сообщения' },
];

export default function Groups() {
  const { user } = useAuth();
  const { openChat, clearActiveChat, markGroupRead, refreshChatSummary } = useChatInbox();
  const navigate = useNavigate();
  const currentUserId = user?._id || user?.id;
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [showJoin, setShowJoin] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [createForm, setCreateForm] = useState({ name: '', description: '' });
  const [joinCode, setJoinCode] = useState('');
  const [joinPassword, setJoinPassword] = useState('');
  const [needsPassword, setNeedsPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showAssignTest, setShowAssignTest] = useState(false);
  const [myTests, setMyTests] = useState([]);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [confirmLeave, setConfirmLeave] = useState(false);
  const [confirmRemoveAssignedTestId, setConfirmRemoveAssignedTestId] = useState(null);
  const [confirmRoleDeleteId, setConfirmRoleDeleteId] = useState(null);
  const [activeTab, setActiveTab] = useState('chat');
  const [mobileShowChat, setMobileShowChat] = useState(false);
  const [kickConfirmId, setKickConfirmId] = useState(null);
  const [banConfirmId, setBanConfirmId] = useState(null);

  // Chat state
  const [messages, setMessages] = useState([]);
  const [chatLoading, setChatLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [replyTo, setReplyTo] = useState(null);
  const [typingUsers, setTypingUsers] = useState([]);
  const typingTimeoutRef = useRef({});
  const socketRef = useRef(null);
  const activeTabRef = useRef(activeTab);

  // Settings state
  const [editName, setEditName] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editPrivate, setEditPrivate] = useState(false);
  const [editPassword, setEditPassword] = useState('');
  const [editRoleName, setEditRoleName] = useState('');
  const [editRoleColor, setEditRoleColor] = useState('#6366f1');
  const [showRoleCreate, setShowRoleCreate] = useState(false);
  const [assignRoleUser, setAssignRoleUser] = useState(null);
  const [editingRoleId, setEditingRoleId] = useState(null);
  const [roleDrafts, setRoleDrafts] = useState({});
  const [savingRoleId, setSavingRoleId] = useState(null);
  const [bannedMembers, setBannedMembers] = useState([]);
  const [loadingBans, setLoadingBans] = useState(false);
  const [unbanConfirmId, setUnbanConfirmId] = useState(null);
  const [avatarBusy, setAvatarBusy] = useState(false);
  const avatarInputRef = useRef(null);

  const syncGroupState = useCallback((group) => {
    setSelectedGroup(group);
    setGroups(prev => prev.map(item => item._id === group._id ? { ...item, ...group } : item));
  }, []);

  const resetGroupView = useCallback(() => {
    setSelectedGroup(null);
    setMessages([]);
    setReplyTo(null);
    setActiveTab('chat');
    setKickConfirmId(null);
    setBanConfirmId(null);
    setUnbanConfirmId(null);
    setAssignRoleUser(null);
    setConfirmLeave(false);
    setConfirmRemoveAssignedTestId(null);
    setConfirmRoleDeleteId(null);
    setEditingRoleId(null);
    setRoleDrafts({});
    setBannedMembers([]);
    setShowRoleCreate(false);
    setEditRoleName('');
    setEditRoleColor('#6366f1');
  }, []);

  const reloadSelectedGroup = useCallback(async (groupId = selectedGroup?._id) => {
    if (!groupId) return null;
    const res = await api.get(`/groups/${groupId}`);
    syncGroupState(res.data);
    return res.data;
  }, [selectedGroup?._id, syncGroupState]);

  useEffect(() => { fetchGroups(); }, []);

  useEffect(() => {
    activeTabRef.current = activeTab;
  }, [activeTab]);

  useEffect(() => {
    if (selectedGroup?._id && activeTab === 'chat') {
      openChat('group', selectedGroup._id);
      markGroupRead(selectedGroup._id);
      return;
    }
    clearActiveChat();
  }, [activeTab, clearActiveChat, markGroupRead, openChat, selectedGroup?._id]);

  useEffect(() => () => clearActiveChat(), [clearActiveChat]);

  // Socket connection
  useEffect(() => {
    const s = connectSocket();
    socketRef.current = s;
    return () => {
      if (selectedGroup) s?.emit('group:leave', selectedGroup._id);
    };
  }, []);

  // Join/leave socket room on group selection
  useEffect(() => {
    const s = socketRef.current || getSocket();
    if (!s) return;

    if (selectedGroup) {
      s.emit('group:join', selectedGroup._id);
      loadMessages(selectedGroup._id, true);
      if (activeTabRef.current === 'chat') {
        markGroupRead(selectedGroup._id);
      }

      const handleMsg = (msg) => {
        if (msg.group === selectedGroup._id || msg.group?._id === selectedGroup._id) {
          setMessages(prev => [...prev, msg]);
          const senderId = msg.sender?._id || msg.sender;
          if (activeTabRef.current === 'chat' && msg.type !== 'system' && senderId !== currentUserId) {
            markGroupRead(selectedGroup._id);
          }
        }
      };
      const handleDeleted = ({ messageId, mode }) => {
        setMessages(prev => (
          mode === 'self'
            ? prev.filter(m => m._id !== messageId)
            : prev.map(m => m._id === messageId ? { ...m, isDeleted: true, isPinned: false, text: '', attachments: [] } : m)
        ));
      };
      const handlePinned = ({ messageId, isPinned }) => {
        setMessages(prev => prev.map(m => m._id === messageId ? { ...m, isPinned } : m));
      };
      const handleMemberRemoved = ({ groupId, userId }) => {
        if (groupId !== selectedGroup._id) return;
        setSelectedGroup(prev => prev ? {
          ...prev,
          members: prev.members?.filter(member => (member.user?._id || member.user) !== userId)
        } : prev);
      };
      const handleKicked = ({ groupId }) => {
        if (groupId !== selectedGroup._id) {
          fetchGroups();
          refreshChatSummary();
          return;
        }

        toast.error('Вас выгнали из группы');
        resetGroupView();
        clearActiveChat();
        fetchGroups();
        refreshChatSummary();
      };
      const handleBanned = ({ groupId }) => {
        if (groupId !== selectedGroup._id) {
          fetchGroups();
          refreshChatSummary();
          return;
        }

        toast.error('Вас забанили в группе');
        resetGroupView();
        clearActiveChat();
        fetchGroups();
        refreshChatSummary();
      };
      const handleTyping = ({ userId, name }) => {
        if (userId === currentUserId) return;
        setTypingUsers(prev => {
          if (prev.find(u => u.userId === userId)) return prev;
          return [...prev, { userId, name }];
        });
        clearTimeout(typingTimeoutRef.current[userId]);
        typingTimeoutRef.current[userId] = setTimeout(() => {
          setTypingUsers(prev => prev.filter(u => u.userId !== userId));
        }, 3000);
      };
      const handleStopTyping = ({ userId }) => {
        setTypingUsers(prev => prev.filter(u => u.userId !== userId));
      };
      const handleError = ({ message }) => {
        if (message) toast.error(message);
      };

      s.on('group:message', handleMsg);
      s.on('group:messageDeleted', handleDeleted);
      s.on('group:messagePinned', handlePinned);
      s.on('group:memberRemoved', handleMemberRemoved);
      s.on('group:kicked', handleKicked);
      s.on('group:banned', handleBanned);
      s.on('group:typing', handleTyping);
      s.on('group:stopTyping', handleStopTyping);
      s.on('group:error', handleError);

      return () => {
        s.emit('group:leave', selectedGroup._id);
        s.off('group:message', handleMsg);
        s.off('group:messageDeleted', handleDeleted);
        s.off('group:messagePinned', handlePinned);
        s.off('group:memberRemoved', handleMemberRemoved);
        s.off('group:kicked', handleKicked);
        s.off('group:banned', handleBanned);
        s.off('group:typing', handleTyping);
        s.off('group:stopTyping', handleStopTyping);
        s.off('group:error', handleError);
      };
    }
  }, [clearActiveChat, currentUserId, markGroupRead, refreshChatSummary, resetGroupView, selectedGroup?._id]);

  const loadMessages = async (groupId, reset = false) => {
    setChatLoading(true);
    try {
      const oldest = reset ? undefined : messages[0]?._id;
      const url = `/groups/${groupId}/messages?limit=50${oldest ? `&before=${oldest}` : ''}`;
      const res = await api.get(url);
      if (reset) {
        setMessages(res.data);
        setHasMore(res.data.length >= 50);
      } else {
        setMessages(prev => [...res.data, ...prev]);
        setHasMore(res.data.length >= 50);
      }
    } catch (e) { /* ignore */ }
    finally { setChatLoading(false); }
  };

  const loadMoreMessages = useCallback(async () => {
    if (!selectedGroup || chatLoading) return;
    await loadMessages(selectedGroup._id, false);
  }, [selectedGroup, chatLoading, messages]);

  const sendMessage = (data) => {
    const s = socketRef.current || getSocket();
    if (!s || !selectedGroup) return;
    s.emit('group:message', { groupId: selectedGroup._id, ...data });
    s.emit('group:stopTyping', { groupId: selectedGroup._id });
  };

  const deleteMessage = (msg, mode) => {
    const s = socketRef.current || getSocket();
    if (!s || !selectedGroup) return;
    s.emit('group:deleteMessage', { groupId: selectedGroup._id, messageId: msg._id, mode });
  };

  const pinMessage = (msg) => {
    const s = socketRef.current || getSocket();
    if (!s || !selectedGroup) return;
    s.emit('group:pinMessage', { groupId: selectedGroup._id, messageId: msg._id });
  };

  const handleTypingInput = () => {
    const s = socketRef.current || getSocket();
    if (!s || !selectedGroup) return;
    s.emit('group:typing', { groupId: selectedGroup._id });
  };

  const fetchGroups = async () => {
    try {
      const res = await api.get('/groups/my');
      setGroups(res.data);
    } catch (err) { toast.error('Ошибка загрузки групп'); }
    finally { setLoading(false); }
  };

  const createGroup = async () => {
    if (!createForm.name.trim()) return toast.error('Введите название');
    setSubmitting(true);
    try {
      const res = await api.post('/groups', createForm);
      setGroups(prev => [res.data, ...prev]);
      setShowCreate(false);
      setCreateForm({ name: '', description: '' });
      toast.success('Группа создана!');
    } catch (err) { toast.error(err.response?.data?.message || 'Ошибка'); }
    finally { setSubmitting(false); }
  };

  const joinGroup = async () => {
    if (!joinCode.trim()) return toast.error('Введите код');
    setSubmitting(true);
    try {
      const res = await api.post(`/groups/join/${joinCode.trim()}`, { password: joinPassword });
      setGroups(prev => [res.data, ...prev.filter(g => g._id !== res.data._id)]);
      setShowJoin(false); setJoinCode(''); setJoinPassword(''); setNeedsPassword(false);
      toast.success('Вы присоединились!');
    } catch (err) {
      if (err.response?.data?.requiresPassword) { setNeedsPassword(true); }
      else toast.error(err.response?.data?.message || 'Ошибка');
    }
    finally { setSubmitting(false); }
  };

  const deleteGroup = async (id) => {
    try {
      await api.delete(`/groups/${id}`);
      setGroups(p => p.filter(g => g._id !== id));
      if (selectedGroup?._id === id) {
        resetGroupView();
        clearActiveChat();
      }
      refreshChatSummary();
      toast.success('Удалена');
    } catch (e) {
      toast.error('Ошибка');
    }
    setConfirmDelete(null);
  };

  const leaveGroup = async (id) => {
    try {
      await api.post(`/groups/${id}/leave`);
      setGroups(p => p.filter(g => g._id !== id));
      if (selectedGroup?._id === id) resetGroupView();
      setConfirmLeave(false);
      clearActiveChat();
      refreshChatSummary();
      toast.success('Вы вышли');
    } catch (e) {
      toast.error(e.response?.data?.message || 'Ошибка');
    }
  };

  const removeMember = async (userId) => {
    try {
      await api.delete(`/groups/${selectedGroup._id}/members/${userId}`);
      await reloadSelectedGroup(selectedGroup._id);
      setKickConfirmId(null);
      toast.success('Участник удалён');
    } catch (e) {
      toast.error(e.response?.data?.message || 'Ошибка');
    }
  };

  const copyCode = (c) => { navigator.clipboard.writeText(c); toast.success('Скопировано'); };
  const copyLink = (c) => { navigator.clipboard.writeText(`${window.location.origin}/groups?join=${c}`); toast.success('Ссылка скопирована'); };

  const regenerateCode = async () => {
    try {
      const res = await api.post(`/groups/${selectedGroup._id}/regenerate-code`);
      setSelectedGroup(p => p ? ({ ...p, inviteCode: res.data.inviteCode }) : p);
      setGroups(prev => prev.map(group => group._id === selectedGroup._id ? { ...group, inviteCode: res.data.inviteCode } : group));
      toast.success('Код обновлён');
    } catch (e) {
      toast.error('Ошибка');
    }
  };

  const openAssignTest = async () => {
    try { const res = await api.get('/tests/my'); setMyTests(res.data.filter(t => !t.isDeleted)); setShowAssignTest(true); } catch (e) { toast.error('Ошибка'); }
  };

  const assignTest = async (testId) => {
    try {
      const res = await api.post(`/groups/${selectedGroup._id}/assign-test`, { testId });
      syncGroupState(res.data);
      setShowAssignTest(false);
      toast.success('Назначен!');
    } catch (e) {
      toast.error(e.response?.data?.message || 'Ошибка');
    }
  };

  const removeAssignedTest = async (testId) => {
    try {
      await api.delete(`/groups/${selectedGroup._id}/assigned-tests/${testId}`);
      await reloadSelectedGroup(selectedGroup._id);
      setConfirmRemoveAssignedTestId(null);
      toast.success('Тест убран');
    } catch (e) {
      toast.error('Ошибка');
    }
  };

  const loadBannedMembers = useCallback(async (groupId = selectedGroup?._id) => {
    if (!groupId) return;
    setLoadingBans(true);
    try {
      const res = await api.get(`/groups/${groupId}/bans`);
      setBannedMembers(res.data || []);
    } catch (e) {
      setBannedMembers([]);
      if (e.response?.status !== 403) {
        toast.error(e.response?.data?.message || 'Не удалось загрузить бан-лист');
      }
    } finally {
      setLoadingBans(false);
    }
  }, [selectedGroup?._id]);

  const handleGroupAvatarUpload = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file || !selectedGroup) return;
    if (!file.type.startsWith('image/')) return toast.error('Нужен файл изображения');
    if (file.size > 5 * 1024 * 1024) return toast.error('Максимум 5MB');

    const formData = new FormData();
    formData.append('avatar', file);
    setAvatarBusy(true);
    try {
      const res = await api.put(`/groups/${selectedGroup._id}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      syncGroupState(res.data);
      toast.success('Аватар группы обновлён');
    } catch (e) {
      toast.error(e.response?.data?.message || 'Ошибка загрузки');
    } finally {
      setAvatarBusy(false);
    }
  };

  const removeGroupAvatar = async () => {
    if (!selectedGroup) return;
    setAvatarBusy(true);
    try {
      const res = await api.put(`/groups/${selectedGroup._id}`, { removeAvatar: true });
      syncGroupState(res.data);
      toast.success('Аватар группы удалён');
    } catch (e) {
      toast.error(e.response?.data?.message || 'Ошибка удаления');
    } finally {
      setAvatarBusy(false);
    }
  };

  const banMember = async (userId) => {
    try {
      const res = await api.post(`/groups/${selectedGroup._id}/members/${userId}/ban`);
      syncGroupState(res.data);
      setBanConfirmId(null);
      setAssignRoleUser(null);
      await loadBannedMembers(selectedGroup._id);
      refreshChatSummary();
      toast.success('Участник забанен');
    } catch (e) {
      toast.error(e.response?.data?.message || 'Ошибка');
    }
  };

  const unbanMember = async (userId) => {
    try {
      const res = await api.delete(`/groups/${selectedGroup._id}/bans/${userId}`);
      setBannedMembers(res.data || []);
      setUnbanConfirmId(null);
      toast.success('Пользователь разбанен');
    } catch (e) {
      toast.error(e.response?.data?.message || 'Ошибка');
    }
  };

  // Roles
  const createRole = async () => {
    if (!editRoleName.trim()) return toast.error('Название роли');
    try {
      const res = await api.post(`/groups/${selectedGroup._id}/roles`, { name: editRoleName, color: editRoleColor });
      setSelectedGroup(p => ({ ...p, roles: res.data }));
      setEditRoleName('');
      setEditRoleColor('#6366f1');
      setShowRoleCreate(false);
      toast.success('Роль создана');
    } catch (e) {
      toast.error(e.response?.data?.message || 'Ошибка');
    }
  };

  const deleteRole = async (roleId) => {
    try {
      const res = await api.delete(`/groups/${selectedGroup._id}/roles/${roleId}`);
      setSelectedGroup(p => ({ ...p, roles: res.data }));
      setConfirmRoleDeleteId(null);
      if (editingRoleId === roleId) {
        setEditingRoleId(null);
      }
      toast.success('Роль удалена');
    } catch (e) {
      toast.error(e.response?.data?.message || 'Ошибка');
    }
  };

  const assignRole = async (userId, roleId) => {
    try {
      const res = await api.put(`/groups/${selectedGroup._id}/members/${userId}/role`, { roleId });
      syncGroupState(res.data);
      setAssignRoleUser(null);
      toast.success('Роль назначена');
    } catch (e) {
      toast.error(e.response?.data?.message || 'Ошибка');
    }
  };

  const startRoleEdit = (role) => {
    const normalizedPermissions = ROLE_PERMISSION_OPTIONS.reduce((acc, option) => {
      acc[option.key] = role.permissions?.[option.key] === true;
      return acc;
    }, {});

    setEditingRoleId(role._id);
    setRoleDrafts(prev => ({
      ...prev,
      [role._id]: {
        name: role.name,
        color: role.color,
        permissions: normalizedPermissions,
      }
    }));
  };

  const updateRoleDraft = (roleId, patch) => {
    setRoleDrafts(prev => ({
      ...prev,
      [roleId]: {
        ...prev[roleId],
        ...patch,
      }
    }));
  };

  const toggleRolePermission = (roleId, permissionKey) => {
    setRoleDrafts(prev => ({
      ...prev,
      [roleId]: {
        ...prev[roleId],
        permissions: {
          ...prev[roleId]?.permissions,
          [permissionKey]: !(prev[roleId]?.permissions?.[permissionKey] === true),
        }
      }
    }));
  };

  const saveRole = async (roleId) => {
    const draft = roleDrafts[roleId];
    if (!draft?.name?.trim()) return toast.error('Введите название роли');

    setSavingRoleId(roleId);
    try {
      const res = await api.put(`/groups/${selectedGroup._id}/roles/${roleId}`, {
        name: draft.name,
        color: draft.color,
        permissions: draft.permissions,
      });
      setSelectedGroup(prev => prev ? ({ ...prev, roles: res.data }) : prev);
      setEditingRoleId(null);
      toast.success('Роль обновлена');
    } catch (e) {
      toast.error(e.response?.data?.message || 'Ошибка');
    } finally {
      setSavingRoleId(null);
    }
  };

  const saveGroupSettings = async () => {
    try {
      const res = await api.put(`/groups/${selectedGroup._id}`, {
        name: editName || selectedGroup.name,
        description: editDesc,
        isPrivate: editPrivate,
        password: editPassword,
      });
      syncGroupState(res.data);
      toast.success('Сохранено');
    } catch (e) { toast.error('Ошибка'); }
  };

  // Join by URL param
  useEffect(() => {
    const code = new URLSearchParams(window.location.search).get('join');
    if (code) { setJoinCode(code); setShowJoin(true); window.history.replaceState({}, '', '/groups'); }
  }, []);

  // Helpers
  const getMyRole = (group) => {
    if (!group || !currentUserId) return null;
    const member = group.members?.find(m => (m.user?._id || m.user) === currentUserId);
    return group.roles?.find(r => r._id === member?.roleId);
  };
  const hasPermission = (group, perm) => getMyRole(group)?.permissions?.[perm] === true;
  const isOwner = (group) => {
    const m = group?.members?.find(m => (m.user?._id || m.user) === currentUserId);
    return m?.roleId === 'owner';
  };
  const getMemberRoleColor = (userId) => {
    const m = selectedGroup?.members?.find(m => (m.user?._id || m.user) === userId);
    const role = selectedGroup?.roles?.find(r => r._id === m?.roleId);
    return role?.color;
  };
  const getMemberRole = (userId) => {
    const m = selectedGroup?.members?.find(m => (m.user?._id || m.user) === userId);
    return selectedGroup?.roles?.find(r => r._id === m?.roleId);
  };
  const canManageMember = (group, targetUserId, permission) => {
    if (!group || !targetUserId || targetUserId === currentUserId) return false;
    if (!hasPermission(group, permission)) return false;

    const myRole = getMyRole(group);
    const targetRole = group.roles?.find(role => role._id === group.members?.find(member => (member.user?._id || member.user) === targetUserId)?.roleId);
    if (!myRole || !targetRole) return false;
    if (targetRole._id === 'owner') return false;

    return targetRole.position < myRole.position;
  };
  const canEditRole = (group, role) => {
    if (!group || !role || role._id === 'owner') return false;
    const myRole = getMyRole(group);
    if (!myRole) return false;
    if (isOwner(group)) return true;
    return role.position < myRole.position;
  };
  const getAssignableRoles = (group) => {
    const myRole = getMyRole(group);
    if (!myRole) return [];
    return (group.roles || [])
      .filter(role => role._id !== 'owner' && (isOwner(group) || role.position < myRole.position))
      .sort((a, b) => b.position - a.position);
  };
  const getEnabledPermissionCount = (role) => ROLE_PERMISSION_OPTIONS.filter(option => role.permissions?.[option.key]).length;

  const gradients = ['from-indigo-500 to-purple-500','from-emerald-500 to-teal-500','from-amber-500 to-orange-500','from-rose-500 to-pink-500','from-cyan-500 to-blue-500','from-violet-500 to-fuchsia-500'];
  const getGrad = (n) => gradients[(n||'').split('').reduce((a,c)=>a+c.charCodeAt(0),0) % gradients.length];

  // Init settings when switching to settings tab
  useEffect(() => {
    if (activeTab === 'settings' && selectedGroup) {
      setEditName(selectedGroup.name);
      setEditDesc(selectedGroup.description || '');
      setEditPrivate(selectedGroup.isPrivate || false);
      setEditPassword(selectedGroup.password || '');
    }
  }, [activeTab, selectedGroup?._id]);

  useEffect(() => {
    if (!selectedGroup?._id) {
      setBannedMembers([]);
      return;
    }

    if (!hasPermission(selectedGroup, 'banMembers')) {
      setBannedMembers([]);
      return;
    }

    if (activeTab === 'members' || activeTab === 'settings') {
      loadBannedMembers(selectedGroup._id);
    }
  }, [activeTab, loadBannedMembers, selectedGroup]);

  const TABS = [
    { id: 'chat', label: 'Чат', icon: MessageSquare },
    { id: 'members', label: 'Участники', icon: Users },
    { id: 'tests', label: 'Тесты', icon: BookOpen },
    { id: 'settings', label: 'Настройки', icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-surface">
      <Navbar />
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
        {selectedGroup ? (
          <div className="flex flex-col lg:flex-row gap-0 lg:gap-0 h-[calc(100vh-120px)]">
            {/* Sidebar: group info + member list (desktop only) */}
            <div className="hidden lg:flex flex-col w-64 bg-white dark:bg-slate-800 rounded-l-2xl border border-r-0 border-gray-200 dark:border-slate-700">
              <div className="p-4 border-b border-gray-100 dark:border-slate-700">
                <button onClick={resetGroupView} className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 mb-3 transition">
                  <ArrowLeft size={14} /> Все группы
                </button>
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${getGrad(selectedGroup.name)} flex items-center justify-center text-white font-bold text-sm flex-shrink-0`}>
                    {selectedGroup.avatar ? <img src={selectedGroup.avatar} alt="" className="w-full h-full rounded-full object-cover" /> : (selectedGroup.name?.[0] || 'G').toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-semibold text-sm text-gray-900 dark:text-gray-100 truncate">{selectedGroup.name}</h3>
                    <p className="text-[10px] text-gray-400">{selectedGroup.members?.length} участников</p>
                  </div>
                </div>
              </div>
              {/* Member list */}
              <div className="flex-1 overflow-y-auto p-3 space-y-0.5 custom-scrollbar">
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider px-2 mb-2">Участники</p>
                {selectedGroup.members?.map(m => {
                  const role = getMemberRole(m.user?._id || m.user);
                  return (
                    <div key={m.user?._id || m.user} className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700/50 transition">
                      <div className="w-7 h-7 rounded-full bg-gray-200 dark:bg-slate-600 flex items-center justify-center text-[10px] font-bold text-gray-500 dark:text-gray-300 flex-shrink-0 overflow-hidden">
                        {m.user?.avatar ? <img src={m.user.avatar} alt="" className="w-full h-full object-cover" /> : (m.user?.firstName?.[0] || '?').toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-gray-700 dark:text-gray-200 truncate">{m.user?.firstName} {m.user?.lastName}</p>
                      </div>
                      {role && role._id !== 'member' && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded-full font-medium" style={{ backgroundColor: role.color + '20', color: role.color }}>{role.name}</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Main content */}
            <div className="flex-1 flex flex-col bg-white dark:bg-slate-800 lg:rounded-r-2xl rounded-2xl lg:rounded-l-none border border-gray-200 dark:border-slate-700 overflow-hidden">
              {/* Header */}
              <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 dark:border-slate-700">
                <button onClick={resetGroupView} className="lg:hidden p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 transition">
                  <ArrowLeft size={16} className="text-gray-400" />
                </button>
                <Hash size={16} className="text-gray-400 hidden sm:block" />
                <h2 className="font-semibold text-gray-900 dark:text-gray-100 text-sm truncate flex-1">{selectedGroup.name}</h2>
                {/* Tabs */}
                <div className="flex items-center gap-1 bg-gray-100 dark:bg-slate-700 rounded-xl p-0.5">
                  {TABS.map(t => (
                    <button key={t.id} onClick={() => setActiveTab(t.id)}
                      className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition ${activeTab === t.id ? 'bg-white dark:bg-slate-600 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}>
                      <t.icon size={12} /> <span className="hidden sm:inline">{t.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Tab content */}
              {activeTab === 'chat' && (
                <div className="flex-1 flex flex-col overflow-hidden">
                <MessageList
                  messages={messages}
                  currentUserId={currentUserId}
                  onReply={setReplyTo}
                  onDelete={deleteMessage}
                  onPin={pinMessage}
                  getDeleteOptions={(message, isOwn) => ({
                    self: true,
                    everyone: isOwn || hasPermission(selectedGroup, 'deleteMessages'),
                  })}
                  canPin={hasPermission(selectedGroup, 'pinMessages')}
                  onLoadMore={loadMoreMessages}
                  hasMore={hasMore}
                    loading={chatLoading}
                    getMemberRoleColor={getMemberRoleColor}
                  />
                  <TypingIndicator typingUsers={typingUsers} />
                  <ChatInput
                    onSend={sendMessage}
                    replyTo={replyTo}
                    onCancelReply={() => setReplyTo(null)}
                    disabled={!hasPermission(selectedGroup, 'sendMessages')}
                  />
                </div>
              )}

              {activeTab === 'members' && (
                <div className="flex-1 overflow-y-auto p-5">
                  <p className="section-title mb-4">Участники ({selectedGroup.members?.length})</p>
                  <div className="space-y-1">
                    {selectedGroup.members?.map(m => {
                      const memberUserId = m.user?._id || m.user;
                      const role = getMemberRole(memberUserId);
                      const canManageRolesForMember = canManageMember(selectedGroup, memberUserId, 'manageRoles');
                      const canKickMember = canManageMember(selectedGroup, memberUserId, 'kickMembers');
                      const canBanMemberAction = canManageMember(selectedGroup, memberUserId, 'banMembers');
                      return (
                        <div key={memberUserId} className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-slate-700/50 transition">
                          <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-slate-600 flex items-center justify-center text-xs font-bold text-gray-500 dark:text-gray-300 flex-shrink-0 overflow-hidden">
                            {m.user?.avatar ? <img src={m.user.avatar} alt="" className="w-full h-full object-cover" /> : (m.user?.firstName?.[0] || '?').toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{m.user?.lastName} {m.user?.firstName}</p>
                            <p className="text-xs text-gray-400">{m.user?.email}</p>
                          </div>
                          <span className="text-[10px] px-2 py-0.5 rounded-full font-medium" style={{ backgroundColor: (role?.color || '#6366f1') + '20', color: role?.color || '#6366f1' }}>{role?.name || 'Участник'}</span>
                          {/* Assign role dropdown */}
                          {canManageRolesForMember && (
                            <div className="relative">
                              <button onClick={() => setAssignRoleUser(assignRoleUser === memberUserId ? null : memberUserId)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-600 text-gray-400 transition">
                                <Shield size={13} />
                              </button>
                              {assignRoleUser === memberUserId && (
                                <div className="absolute right-0 top-8 z-20 bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-xl shadow-lg p-2 min-w-[140px]">
                                  {getAssignableRoles(selectedGroup).map(r => (
                                    <button key={r._id} onClick={() => assignRole(memberUserId, r._id)}
                                      className={`w-full text-left px-3 py-1.5 rounded-lg text-xs hover:bg-gray-100 dark:hover:bg-slate-600 transition ${m.roleId === r._id ? 'font-semibold' : ''}`}>
                                      <span className="inline-block w-2 h-2 rounded-full mr-2" style={{ backgroundColor: r.color }} />
                                      {r.name}
                                    </button>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}
                          {/* Kick */}
                          {canKickMember && (
                            kickConfirmId === memberUserId ? (
                              <div className="flex items-center gap-1">
                                <button
                                  onClick={() => removeMember(memberUserId)}
                                  className="rounded-lg bg-red-50 px-2.5 py-1.5 text-[11px] font-semibold text-red-600 transition hover:bg-red-100 dark:bg-red-900/20 dark:hover:bg-red-900/30"
                                >
                                  Выгнать
                                </button>
                                <button
                                  onClick={() => setKickConfirmId(null)}
                                  className="rounded-lg px-2.5 py-1.5 text-[11px] font-medium text-gray-400 transition hover:bg-gray-100 dark:hover:bg-slate-700"
                                >
                                  Отмена
                                </button>
                              </div>
                            ) : (
                              <button onClick={() => { setKickConfirmId(memberUserId); setBanConfirmId(null); }} className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-400 hover:text-red-500 transition">
                                <X size={14} />
                              </button>
                            )
                          )}
                          {canBanMemberAction && (
                            banConfirmId === memberUserId ? (
                              <div className="flex items-center gap-1">
                                <button
                                  onClick={() => banMember(memberUserId)}
                                  className="rounded-lg bg-amber-50 px-2.5 py-1.5 text-[11px] font-semibold text-amber-700 transition hover:bg-amber-100 dark:bg-amber-900/20 dark:hover:bg-amber-900/30"
                                >
                                  Забанить
                                </button>
                                <button
                                  onClick={() => setBanConfirmId(null)}
                                  className="rounded-lg px-2.5 py-1.5 text-[11px] font-medium text-gray-400 transition hover:bg-gray-100 dark:hover:bg-slate-700"
                                >
                                  Отмена
                                </button>
                              </div>
                            ) : (
                              <button onClick={() => { setBanConfirmId(memberUserId); setKickConfirmId(null); }} className="p-1.5 rounded-lg hover:bg-amber-50 dark:hover:bg-amber-900/20 text-gray-400 hover:text-amber-600 transition">
                                <Ban size={14} />
                              </button>
                            )
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {activeTab === 'tests' && (
                <div className="flex-1 overflow-y-auto p-5">
                  <div className="flex items-center justify-between mb-4">
                    <p className="section-title">Тесты ({selectedGroup.assignedTests?.length || 0})</p>
                    {hasPermission(selectedGroup, 'assignTests') && (
                      <button onClick={openAssignTest} className="btn-primary py-1.5 px-3 text-xs flex items-center gap-1.5"><Plus size={13} /> Назначить</button>
                    )}
                  </div>
                  {selectedGroup.assignedTests?.length === 0 ? (
                    <div className="text-center py-16"><BookOpen size={28} className="text-gray-300 dark:text-gray-600 mx-auto mb-2" /><p className="text-sm text-gray-400">Нет тестов</p></div>
                  ) : (
                    <div className="space-y-2">
                      {selectedGroup.assignedTests?.map(at => (
                        <div key={at.test?._id || at._id} className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 dark:border-slate-700 hover:border-gray-200 dark:hover:border-slate-600 transition">
                          <div className="w-9 h-9 rounded-lg bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center"><BookOpen size={16} className="text-amber-500" /></div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{at.test?.title || 'Удалённый тест'}</p>
                            <p className="text-xs text-gray-400">{at.test?.totalPoints || 0} баллов</p>
                          </div>
                          <button onClick={() => at.test?.shareLink && navigate(`/test-profile/${at.test.shareLink}`)} className="btn-secondary py-1.5 px-3 text-xs"><ExternalLink size={12} /></button>
                          {hasPermission(selectedGroup, 'assignTests') && (
                            confirmRemoveAssignedTestId === (at.test?._id || at._id) ? (
                              <div className="flex items-center gap-1">
                                <button
                                  onClick={() => removeAssignedTest(at.test?._id)}
                                  className="rounded-lg bg-red-50 px-2.5 py-1.5 text-[11px] font-semibold text-red-600 transition hover:bg-red-100 dark:bg-red-900/20 dark:hover:bg-red-900/30"
                                >
                                  Убрать
                                </button>
                                <button
                                  onClick={() => setConfirmRemoveAssignedTestId(null)}
                                  className="rounded-lg px-2.5 py-1.5 text-[11px] font-medium text-gray-400 transition hover:bg-gray-100 dark:hover:bg-slate-700"
                                >
                                  Отмена
                                </button>
                              </div>
                            ) : (
                              <button onClick={() => setConfirmRemoveAssignedTestId(at.test?._id || at._id)} className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-400 hover:text-red-500 transition"><X size={14} /></button>
                            )
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'settings' && (
                <div className="flex-1 overflow-y-auto p-5 space-y-6">
                  {/* Basic settings */}
                  {hasPermission(selectedGroup, 'manageGroup') && (
                    <div className="glass-card-solid p-5 space-y-4">
                      <p className="section-title">Основные</p>
                      <div className="flex flex-col gap-4 rounded-2xl border border-gray-100 bg-gray-50/70 p-4 dark:border-slate-700 dark:bg-slate-700/40 sm:flex-row sm:items-center">
                        <div className={`w-20 h-20 rounded-2xl bg-gradient-to-br ${getGrad(selectedGroup.name)} flex items-center justify-center text-white font-bold text-2xl shadow-sm overflow-hidden flex-shrink-0`}>
                          {selectedGroup.avatar ? <img src={selectedGroup.avatar} alt="" className="w-full h-full object-cover" /> : (selectedGroup.name?.[0] || 'G').toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">Аватар группы</p>
                          <p className="text-xs text-gray-400 mt-1">Изображение показывается в списке групп, шапке и чате.</p>
                          <div className="flex flex-wrap gap-2 mt-3">
                            <input
                              ref={avatarInputRef}
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={handleGroupAvatarUpload}
                            />
                            <button
                              type="button"
                              onClick={() => avatarInputRef.current?.click()}
                              disabled={avatarBusy}
                              className="btn-secondary py-2 px-4 text-xs inline-flex items-center gap-1.5"
                            >
                              {selectedGroup.avatar ? <Upload size={13} /> : <ImagePlus size={13} />}
                              {selectedGroup.avatar ? 'Заменить' : 'Загрузить'}
                            </button>
                            {selectedGroup.avatar && (
                              <button
                                type="button"
                                onClick={removeGroupAvatar}
                                disabled={avatarBusy}
                                className="inline-flex items-center gap-1.5 rounded-xl border border-red-200 px-4 py-2 text-xs font-medium text-red-500 transition hover:bg-red-50 dark:border-red-800/50 dark:hover:bg-red-900/20"
                              >
                                <Trash2 size={13} /> Удалить
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                      <div>
                        <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1 block">Название</label>
                        <input className="input-field text-sm" value={editName} onChange={e => setEditName(e.target.value)} />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1 block">Описание</label>
                        <textarea className="input-field text-sm resize-none" rows={2} value={editDesc} onChange={e => setEditDesc(e.target.value)} />
                      </div>
                      <div className="flex items-center gap-3">
                        <label className="text-xs font-medium text-gray-600 dark:text-gray-400">Приватная группа</label>
                        <button onClick={() => setEditPrivate(!editPrivate)} className={`w-10 h-5 rounded-full transition-colors ${editPrivate ? 'bg-blue-500' : 'bg-gray-300 dark:bg-slate-600'}`}>
                          <div className={`w-4 h-4 rounded-full bg-white shadow transition-transform ${editPrivate ? 'translate-x-5' : 'translate-x-0.5'}`} />
                        </button>
                      </div>
                      {editPrivate && (
                        <div>
                          <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1 block">Пароль (необязательно)</label>
                          <input className="input-field text-sm" placeholder="Без пароля" value={editPassword} onChange={e => setEditPassword(e.target.value)} />
                        </div>
                      )}
                      <button onClick={saveGroupSettings} className="btn-primary py-2 px-5 text-sm">Сохранить</button>
                    </div>
                  )}

                  {/* Invite code */}
                  {hasPermission(selectedGroup, 'manageGroup') && (
                    <div className="glass-card-solid p-5">
                      <p className="section-title mb-3">Приглашение</p>
                      <div className="flex items-center gap-2 flex-wrap">
                        <code className="inline-flex items-center gap-2 bg-gray-50 dark:bg-slate-700 px-4 py-2 rounded-xl text-sm font-mono font-semibold text-gray-900 dark:text-gray-100 border border-gray-200 dark:border-slate-600">
                          <Link2 size={14} className="text-blue-500" /> {selectedGroup.inviteCode}
                        </code>
                        <button onClick={() => copyCode(selectedGroup.inviteCode)} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-500 transition"><Copy size={15} /></button>
                        <button onClick={() => copyLink(selectedGroup.inviteCode)} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-500 transition"><ExternalLink size={15} /></button>
                        <button onClick={regenerateCode} className="p-2 rounded-lg hover:bg-amber-50 dark:hover:bg-amber-900/20 text-gray-500 hover:text-amber-600 transition"><RefreshCw size={15} /></button>
                      </div>
                    </div>
                  )}

                  {/* Roles */}
                  {hasPermission(selectedGroup, 'manageRoles') && (
                    <div className="glass-card-solid p-5">
                      <div className="flex items-center justify-between mb-4">
                        <p className="section-title">Роли</p>
                        <button onClick={() => setShowRoleCreate(!showRoleCreate)} className="btn-secondary py-1.5 px-3 text-xs flex items-center gap-1"><Plus size={12} /> Создать</button>
                      </div>
                      {showRoleCreate && (
                        <div className="flex items-center gap-2 mb-4 p-3 bg-gray-50 dark:bg-slate-700 rounded-xl">
                          <input value={editRoleName} onChange={e => setEditRoleName(e.target.value)} className="input-field text-sm flex-1" placeholder="Название роли" />
                          <input type="color" value={editRoleColor} onChange={e => setEditRoleColor(e.target.value)} className="w-8 h-8 rounded-lg cursor-pointer border-0" />
                          <button onClick={createRole} className="btn-primary py-2 px-4 text-xs">Добавить</button>
                        </div>
                      )}
                      <div className="space-y-2">
                        {selectedGroup.roles?.slice().sort((a,b) => b.position - a.position).map(r => (
                          <div key={r._id} className="rounded-2xl border border-gray-100 p-4 dark:border-slate-700">
                            <div className="flex flex-wrap items-center gap-3">
                              <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: r.color }} />
                              <div className="min-w-0 flex-1">
                                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{r.name}</p>
                                <p className="text-[11px] text-gray-400">Включено прав: {getEnabledPermissionCount(r)}</p>
                              </div>
                              <span className="text-[10px] text-gray-400">pos: {r.position}</span>
                              {canEditRole(selectedGroup, r) && (
                                editingRoleId === r._id ? (
                                  <div className="flex items-center gap-1">
                                    <button
                                      onClick={() => saveRole(r._id)}
                                      disabled={savingRoleId === r._id}
                                      className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 px-2.5 py-1.5 text-[11px] font-semibold text-emerald-600 transition hover:bg-emerald-100 dark:bg-emerald-900/20 dark:hover:bg-emerald-900/30"
                                    >
                                      <Check size={12} /> {savingRoleId === r._id ? '...' : 'Сохранить'}
                                    </button>
                                    <button
                                      onClick={() => setEditingRoleId(null)}
                                      className="rounded-lg px-2.5 py-1.5 text-[11px] font-medium text-gray-400 transition hover:bg-gray-100 dark:hover:bg-slate-700"
                                    >
                                      Отмена
                                    </button>
                                  </div>
                                ) : (
                                  <button onClick={() => startRoleEdit(r)} className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[11px] font-medium text-gray-500 transition hover:bg-gray-100 dark:hover:bg-slate-700">
                                    <Pencil size={12} /> Изменить
                                  </button>
                                )
                              )}
                              {!['owner', 'admin', 'member'].includes(r._id) && canEditRole(selectedGroup, r) && (
                                confirmRoleDeleteId === r._id ? (
                                  <div className="flex items-center gap-1">
                                    <button
                                      onClick={() => deleteRole(r._id)}
                                      className="rounded-lg bg-red-50 px-2.5 py-1.5 text-[11px] font-semibold text-red-600 transition hover:bg-red-100 dark:bg-red-900/20 dark:hover:bg-red-900/30"
                                    >
                                      Удалить
                                    </button>
                                    <button
                                      onClick={() => setConfirmRoleDeleteId(null)}
                                      className="rounded-lg px-2.5 py-1.5 text-[11px] font-medium text-gray-400 transition hover:bg-gray-100 dark:hover:bg-slate-700"
                                    >
                                      Отмена
                                    </button>
                                  </div>
                                ) : (
                                  <button onClick={() => setConfirmRoleDeleteId(r._id)} className="p-1 rounded hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-400 hover:text-red-500 transition"><Trash2 size={13} /></button>
                                )
                              )}
                            </div>

                            {editingRoleId === r._id && roleDrafts[r._id] ? (
                              <div className="mt-4 space-y-4 rounded-2xl bg-gray-50/80 p-4 dark:bg-slate-700/40">
                                <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
                                  <input
                                    value={roleDrafts[r._id].name}
                                    onChange={e => updateRoleDraft(r._id, { name: e.target.value })}
                                    className="input-field text-sm"
                                    placeholder="Название роли"
                                  />
                                  <input
                                    type="color"
                                    value={roleDrafts[r._id].color}
                                    onChange={e => updateRoleDraft(r._id, { color: e.target.value })}
                                    className="h-11 w-14 rounded-xl cursor-pointer border-0 bg-transparent"
                                  />
                                </div>
                                <div className="grid gap-2 md:grid-cols-2">
                                  {ROLE_PERMISSION_OPTIONS.map(option => (
                                    <button
                                      key={option.key}
                                      type="button"
                                      onClick={() => toggleRolePermission(r._id, option.key)}
                                      className={`flex items-center justify-between rounded-xl border px-3 py-2 text-left text-xs font-medium transition ${
                                        roleDrafts[r._id].permissions?.[option.key]
                                          ? 'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800/50 dark:bg-blue-900/20 dark:text-blue-300'
                                          : 'border-gray-200 bg-white text-gray-500 hover:border-gray-300 dark:border-slate-600 dark:bg-slate-800 dark:text-gray-300'
                                      }`}
                                    >
                                      <span>{option.label}</span>
                                      <span className={`ml-3 inline-flex h-5 w-9 rounded-full transition ${roleDrafts[r._id].permissions?.[option.key] ? 'bg-blue-500' : 'bg-gray-300 dark:bg-slate-600'}`}>
                                        <span className={`mt-0.5 ml-0.5 h-4 w-4 rounded-full bg-white shadow transition ${roleDrafts[r._id].permissions?.[option.key] ? 'translate-x-4' : ''}`} />
                                      </span>
                                    </button>
                                  ))}
                                </div>
                              </div>
                            ) : (
                              <div className="mt-3 flex flex-wrap gap-2">
                                {ROLE_PERMISSION_OPTIONS.map(option => (
                                  <span
                                    key={option.key}
                                    className={`rounded-full px-2.5 py-1 text-[10px] font-medium ${
                                      r.permissions?.[option.key]
                                        ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-300'
                                        : 'bg-gray-100 text-gray-400 dark:bg-slate-700 dark:text-gray-500'
                                    }`}
                                  >
                                    {option.label}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {hasPermission(selectedGroup, 'banMembers') && (
                    <div className="glass-card-solid p-5">
                      <div className="flex items-center justify-between gap-3 mb-4">
                        <div>
                          <p className="section-title">Забаненные участники</p>
                          <p className="text-xs text-gray-400 mt-1">Разбан открывает только повторный вход. В группу пользователь сам не возвращается.</p>
                        </div>
                        <span className="text-xs text-gray-400">{bannedMembers.length}</span>
                      </div>
                      {loadingBans ? (
                        <p className="text-sm text-gray-400">Загрузка...</p>
                      ) : bannedMembers.length === 0 ? (
                        <p className="text-sm text-gray-400">Бан-лист пуст.</p>
                      ) : (
                        <div className="space-y-2">
                          {bannedMembers.map(entry => {
                            const bannedUserId = entry.user?._id || entry.user;
                            const bannedByName = entry.bannedBy ? `${entry.bannedBy.firstName || ''} ${entry.bannedBy.lastName || ''}`.trim() : 'Неизвестно';
                            return (
                              <div key={bannedUserId} className="flex flex-wrap items-center gap-3 rounded-xl border border-gray-100 p-3 dark:border-slate-700">
                                <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-slate-600 flex items-center justify-center text-xs font-bold text-gray-500 dark:text-gray-300 overflow-hidden">
                                  {entry.user?.avatar ? <img src={entry.user.avatar} alt="" className="w-full h-full object-cover" /> : (entry.user?.firstName?.[0] || '?').toUpperCase()}
                                </div>
                                <div className="min-w-0 flex-1">
                                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{entry.user?.lastName} {entry.user?.firstName}</p>
                                  <p className="text-xs text-gray-400">Забанил: {bannedByName}</p>
                                </div>
                                {unbanConfirmId === bannedUserId ? (
                                  <div className="flex items-center gap-1">
                                    <button
                                      onClick={() => unbanMember(bannedUserId)}
                                      className="rounded-lg bg-emerald-50 px-2.5 py-1.5 text-[11px] font-semibold text-emerald-600 transition hover:bg-emerald-100 dark:bg-emerald-900/20 dark:hover:bg-emerald-900/30"
                                    >
                                      Разбанить
                                    </button>
                                    <button
                                      onClick={() => setUnbanConfirmId(null)}
                                      className="rounded-lg px-2.5 py-1.5 text-[11px] font-medium text-gray-400 transition hover:bg-gray-100 dark:hover:bg-slate-700"
                                    >
                                      Отмена
                                    </button>
                                  </div>
                                ) : (
                                  <button onClick={() => setUnbanConfirmId(bannedUserId)} className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[11px] font-medium text-amber-600 transition hover:bg-amber-50 dark:hover:bg-amber-900/20">
                                    <Ban size={12} /> Разбанить
                                  </button>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Leave / Delete */}
                  <div className="flex gap-3">
                    {!isOwner(selectedGroup) && (
                      <button onClick={() => setConfirmLeave(true)} className="inline-flex items-center gap-2 text-sm font-medium text-red-500 border border-red-200 dark:border-red-800/50 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl px-4 py-2.5 transition">
                        <LogOut size={15} /> Покинуть
                      </button>
                    )}
                    {isOwner(selectedGroup) && (
                      <button onClick={() => setConfirmDelete(selectedGroup._id)} className="inline-flex items-center gap-2 text-sm font-medium text-red-500 border border-red-200 dark:border-red-800/50 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl px-4 py-2.5 transition">
                        <Trash2 size={15} /> Удалить группу
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          /* ── Groups List ── */
          <>
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <button onClick={() => navigate(-1)} className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-slate-800 transition"><ArrowLeft size={20} className="text-gray-400" /></button>
                <div><h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Группы</h1><p className="text-xs text-gray-400 mt-0.5">{groups.length} групп</p></div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => setShowJoin(true)} className="btn-secondary flex items-center gap-1.5 py-2 px-4 text-xs"><UserPlus size={14} /> Вступить</button>
                <button onClick={() => setShowCreate(true)} className="btn-primary flex items-center gap-1.5 py-2 px-4 text-xs"><Plus size={14} /> Создать</button>
              </div>
            </motion.div>

            {loading ? (
              <div className="space-y-3">{[1,2,3].map(i => (<div key={i} className="glass-card-solid p-5 animate-pulse"><div className="flex items-center gap-4"><div className="w-12 h-12 rounded-full bg-gray-200 dark:bg-slate-700" /><div className="flex-1"><div className="h-4 bg-gray-200 dark:bg-slate-700 rounded w-1/3 mb-2" /><div className="h-3 bg-gray-100 dark:bg-slate-700 rounded w-1/4" /></div></div></div>))}</div>
            ) : groups.length === 0 ? (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-20">
                <div className="w-16 h-16 bg-primary-50 dark:bg-primary-900/20 rounded-full flex items-center justify-center mx-auto mb-4"><Users className="w-7 h-7 text-primary-400" /></div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-1">Нет групп</h3>
                <p className="text-gray-400 text-sm mb-6">Создайте группу или присоединитесь</p>
                <div className="flex gap-2 justify-center">
                  <button onClick={() => setShowJoin(true)} className="btn-secondary py-2.5 px-5 text-sm flex items-center gap-2"><UserPlus size={15} /> Вступить</button>
                  <button onClick={() => setShowCreate(true)} className="btn-primary py-2.5 px-5 text-sm flex items-center gap-2"><Plus size={15} /> Создать</button>
                </div>
              </motion.div>
            ) : (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
                {groups.map((g, i) => (
                  <motion.div key={g._id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                    onClick={() => {
                      setSelectedGroup(g);
                      setKickConfirmId(null);
                      setBanConfirmId(null);
                      setUnbanConfirmId(null);
                      setAssignRoleUser(null);
                      setConfirmLeave(false);
                      setConfirmRemoveAssignedTestId(null);
                      setConfirmRoleDeleteId(null);
                      setEditingRoleId(null);
                      setRoleDrafts({});
                      setBannedMembers([]);
                    }} className="glass-card-solid p-5 flex items-center gap-4 cursor-pointer group">
                    <div className={`w-12 h-12 rounded-full bg-gradient-to-br ${getGrad(g.name)} flex items-center justify-center text-white font-bold text-lg flex-shrink-0 shadow-sm overflow-hidden`}>
                      {g.avatar ? <img src={g.avatar} alt="" className="w-full h-full object-cover" /> : (g.name?.[0] || 'G').toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-gray-900 dark:text-gray-100 truncate group-hover:text-primary-600 dark:group-hover:text-primary-400 transition">{g.name}</h3>
                        {isOwner(g) && <span className="text-[10px] bg-red-50 dark:bg-red-900/30 text-red-500 px-2 py-0.5 rounded-full font-medium">owner</span>}
                      </div>
                      <div className="flex items-center gap-4 mt-1 text-xs text-gray-400">
                        <span className="flex items-center gap-1"><Users size={12} /> {g.members?.length}</span>
                        <span className="flex items-center gap-1"><BookOpen size={12} /> {g.assignedTests?.length || 0}</span>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </motion.div>
            )}
          </>
        )}

        {/* ── Modals ── */}
        {/* Create */}
        <AnimatePresence>
          {showCreate && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={() => setShowCreate(false)}>
              <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="glass-card-solid p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
                <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-4">Создать группу</h3>
                <div className="space-y-3 mb-5">
                  <div><label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1 block">Название</label><input className="input-field text-sm" placeholder="Математика 101" value={createForm.name} onChange={e => setCreateForm(p => ({ ...p, name: e.target.value }))} autoFocus /></div>
                  <div><label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1 block">Описание</label><textarea className="input-field resize-none text-sm" rows={2} placeholder="Необязательно" value={createForm.description} onChange={e => setCreateForm(p => ({ ...p, description: e.target.value }))} /></div>
                </div>
                <div className="flex gap-2 justify-end">
                  <button onClick={() => setShowCreate(false)} className="btn-secondary py-2 px-4 text-sm">Отмена</button>
                  <button onClick={createGroup} disabled={submitting} className="btn-primary py-2 px-5 text-sm">{submitting ? '...' : 'Создать'}</button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Join */}
        <AnimatePresence>
          {showJoin && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={() => { setShowJoin(false); setNeedsPassword(false); }}>
              <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="glass-card-solid p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
                <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-4">Присоединиться</h3>
                <div className="space-y-3 mb-5">
                  <div><label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1 block">Код приглашения</label><input className="input-field text-sm font-mono" placeholder="abc123" value={joinCode} onChange={e => setJoinCode(e.target.value)} autoFocus /></div>
                  {needsPassword && (
                    <div><label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1 block">Пароль группы</label><input type="password" className="input-field text-sm" placeholder="Введите пароль" value={joinPassword} onChange={e => setJoinPassword(e.target.value)} /></div>
                  )}
                </div>
                <div className="flex gap-2 justify-end">
                  <button onClick={() => { setShowJoin(false); setNeedsPassword(false); }} className="btn-secondary py-2 px-4 text-sm">Отмена</button>
                  <button onClick={joinGroup} disabled={submitting} className="btn-primary py-2 px-5 text-sm">{submitting ? '...' : 'Вступить'}</button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Assign test */}
        <AnimatePresence>
          {showAssignTest && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={() => setShowAssignTest(false)}>
              <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="glass-card-solid p-6 w-full max-w-md max-h-[70vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-4">Назначить тест</h3>
                {myTests.length === 0 ? <p className="text-sm text-gray-400 text-center py-8">Нет тестов</p> : (
                  <div className="space-y-2">{myTests.map(t => {
                    const assigned = selectedGroup?.assignedTests?.some(at => at.test?._id === t._id);
                    return (<button key={t._id} onClick={() => !assigned && assignTest(t._id)} disabled={assigned} className={`w-full text-left p-3 rounded-xl border transition ${assigned ? 'opacity-40 border-gray-100 dark:border-slate-700' : 'border-gray-200 dark:border-slate-600 hover:border-blue-300 dark:hover:border-blue-600 cursor-pointer'}`}><p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{t.title}</p><p className="text-xs text-gray-400 mt-0.5">{t.totalPoints} баллов{assigned ? ' — назначен' : ''}</p></button>);
                  })}</div>
                )}
                <button onClick={() => setShowAssignTest(false)} className="btn-secondary w-full py-2 text-sm mt-4">Закрыть</button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <ConfirmDialog isOpen={confirmLeave} onClose={() => setConfirmLeave(false)} onConfirm={() => leaveGroup(selectedGroup?._id)} title="Покинуть группу?" message="Вы потеряете доступ к чату и назначенным тестам этой группы." confirmText="Покинуть" variant="warning" />
        <ConfirmDialog isOpen={!!confirmDelete} onClose={() => setConfirmDelete(null)} onConfirm={() => deleteGroup(confirmDelete)} title="Удалить группу?" message="Все данные будут утеряны." confirmText="Удалить" variant="danger" />
      </main>
    </div>
  );
}
