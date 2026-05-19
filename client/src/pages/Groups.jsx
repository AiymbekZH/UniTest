import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users, Plus, Copy, ExternalLink, ArrowLeft, X, Trash2,
  BookOpen, UserPlus, LogOut, RefreshCw, Link2, MessageSquare,
  Settings, Shield, Hash, Search, ChevronDown, Ban, Check, Pencil, Upload, ImagePlus, Swords,
  Megaphone, BarChart3, Trophy, TrendingUp, Edit3, Save
} from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useChatInbox } from '../context/ChatInboxContext';
import { connectSocket, getSocket } from '../services/socket';
import toast from 'react-hot-toast';
import Navbar from '../components/Navbar';
import EmptyState from '../components/EmptyState';
import AnimatedHero from '../components/AnimatedHero';
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
  { key: 'launchArenas', label: 'Запускать арены' },
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

  // Phase 5: announcement, member search, stats
  const [memberSearchQuery, setMemberSearchQuery] = useState('');
  const [editingAnnouncement, setEditingAnnouncement] = useState(false);
  const [announcementDraft, setAnnouncementDraft] = useState('');
  const [savingAnnouncement, setSavingAnnouncement] = useState(false);
  const [groupStats, setGroupStats] = useState(null);
  const [statsLoading, setStatsLoading] = useState(false);

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
        if (msg.group !== selectedGroup._id && msg.group?._id !== selectedGroup._id) return;
        const senderId = msg.sender?._id || msg.sender;
        const echoClientId = msg.clientId || null;

        setMessages(prev => {
          // Own-echo swap by clientId keeps optimistic placeholders from
          // duplicating once the server persists them. Same anti-dup fix
          // as the DM page.
          if (echoClientId && senderId === currentUserId) {
            const idx = prev.findIndex(m => m.clientId === echoClientId);
            if (idx >= 0) {
              const next = prev.slice();
              next[idx] = msg;
              return next;
            }
          }
          if (msg._id && prev.some(m => m._id === msg._id)) return prev;
          return [...prev, msg];
        });

        if (activeTabRef.current === 'chat' && msg.type !== 'system' && senderId !== currentUserId) {
          markGroupRead(selectedGroup._id);
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
      const handleError = ({ code, message }) => {
        // EMPTY_TEXT is a UX hint — don't toast it. Everything else is worth
        // surfacing so the user isn't confused why nothing happened.
        if (code === 'EMPTY_TEXT') return;
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

  // Optimistic send with ack — mirrors Messages.jsx. See the bigger comment
  // block there for the rationale (silent server returns were eating user
  // input, we now always show the bubble and a retry affordance on fail).
  const sendMessage = (data) => {
    const s = socketRef.current || getSocket();
    if (!s || !selectedGroup) {
      toast.error(s ? 'Группа не выбрана' : 'Нет соединения. Перезагрузите страницу.');
      return false;
    }

    const clientId = `tmp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const optimistic = {
      _id: clientId,
      clientId,
      group: selectedGroup._id,
      sender: {
        _id: currentUserId,
        firstName: user?.firstName,
        lastName: user?.lastName,
        avatar: user?.avatar,
        uniqueId: user?.uniqueId,
      },
      type: data.type || 'text',
      text: data.text || '',
      attachments: data.attachments || [],
      replyTo: data.replyTo
        ? (messages.find(m => m._id === data.replyTo) || { _id: data.replyTo })
        : null,
      createdAt: new Date().toISOString(),
      reactions: [],
      isDeleted: false,
      isPinned: false,
      status: 'sending',
      _retryPayload: data,
    };

    setMessages(prev => [...prev, optimistic]);

    const payload = {
      groupId: selectedGroup._id,
      ...data,
      replyTo: data.replyTo || null,
      clientId,
    };

    s.timeout(8000).emit('group:message', payload, (err, ack) => {
      if (err) {
        setMessages(prev => prev.map(m =>
          m.clientId === clientId ? { ...m, status: 'failed' } : m
        ));
        return;
      }
      if (ack && ack.ok === false) {
        setMessages(prev => prev.map(m =>
          m.clientId === clientId ? { ...m, status: 'failed' } : m
        ));
        if (ack.message && ack.code !== 'EMPTY_TEXT') toast.error(ack.message);
        return;
      }
      // success — group:message broadcast will swap the bubble via clientId
    });

    s.emit('group:stopTyping', { groupId: selectedGroup._id });
    return true;
  };

  const retryMessage = (failedMsg) => {
    if (!failedMsg?._retryPayload) return;
    const data = failedMsg._retryPayload;
    setMessages(prev => prev.filter(m => m.clientId !== failedMsg.clientId));
    sendMessage(data);
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

  const launchArenaFromGroup = async (testId) => {
    if (!selectedGroup?._id) return;
    try {
      const res = await api.post('/arena/rooms', {
        testId,
        sourceType: 'group',
        groupId: selectedGroup._id
      });
      navigate(`/arena/host/${res.data.room._id}`);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Не удалось запустить групповую арену');
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
  const hasPermission = (group, perm) => {
    const role = getMyRole(group);
    if (!role) return false;
    if (perm === 'launchArenas' && role.permissions?.launchArenas === undefined) {
      return role._id === 'owner' || role._id === 'admin';
    }
    return role.permissions?.[perm] === true;
  };
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
    { id: 'stats', label: 'Статистика', icon: BarChart3 },
    { id: 'settings', label: 'Настройки', icon: Settings },
  ];

  // Save announcement
  const saveAnnouncement = async () => {
    if (!selectedGroup?._id) return;
    const text = announcementDraft.trim().slice(0, 500);
    setSavingAnnouncement(true);
    try {
      const res = await api.patch(`/groups/${selectedGroup._id}/announcement`, { text });
      const updated = { ...selectedGroup, announcement: res.data.announcement };
      syncGroupState(updated);
      setEditingAnnouncement(false);
      toast.success(text ? 'Объявление обновлено' : 'Объявление удалено');
    } catch (e) {
      toast.error(e.response?.data?.message || 'Ошибка');
    } finally {
      setSavingAnnouncement(false);
    }
  };

  // Lazy-load stats when entering Stats tab
  useEffect(() => {
    if (activeTab !== 'stats' || !selectedGroup?._id) return;
    let cancelled = false;
    setStatsLoading(true);
    api.get(`/groups/${selectedGroup._id}/stats`)
      .then(res => { if (!cancelled) setGroupStats(res.data); })
      .catch(() => { if (!cancelled) setGroupStats(null); })
      .finally(() => { if (!cancelled) setStatsLoading(false); });
    return () => { cancelled = true; };
  }, [activeTab, selectedGroup?._id]);

  // Filtered member list (memberSearchQuery is applied case-insensitively to name+username+id)
  const filteredMembers = (() => {
    if (!selectedGroup?.members) return [];
    const q = memberSearchQuery.trim().toLowerCase();
    if (!q) return selectedGroup.members;
    return selectedGroup.members.filter(m => {
      const u = m.user || {};
      const hay = [
        u.firstName, u.lastName, u.username, u.uniqueId, u.email,
      ].filter(Boolean).join(' ').toLowerCase();
      return hay.includes(q);
    });
  })();

  return (
    <div className="min-h-screen bg-surface">
      <Navbar />
      <main className="mx-auto max-w-6xl px-2 py-3 sm:px-4 sm:py-5 lg:px-6">
        {selectedGroup ? (
          <div className="flex h-[calc(100vh-110px)] flex-col overflow-hidden chunky-card p-0 lg:h-[calc(100vh-130px)] lg:flex-row">
            {/* Sidebar: group info + member list (desktop only) */}
            <div className="hidden lg:flex flex-col w-64 flex-shrink-0 bg-white border-r-2 border-slate-200 dark:bg-slate-800 dark:border-slate-700">
              <div className="flex-shrink-0 border-b-2 border-slate-200 p-4 dark:border-slate-700">
                <button
                  onClick={resetGroupView}
                  className="mb-3 inline-flex items-center gap-1.5 rounded-xl border-2 border-slate-900 bg-white px-2.5 py-1.5 text-[11px] font-black text-slate-900 transition active:translate-y-[2px] dark:border-white dark:bg-slate-900 dark:text-white"
                  style={{ boxShadow: '0 2px 0 #0f172a' }}
                >
                  <ArrowLeft size={12} strokeWidth={2.4} /> Все группы
                </button>
                <div className="flex items-center gap-3">
                  <div className={`flex h-12 w-12 flex-shrink-0 items-center justify-center overflow-hidden rounded-2xl border-2 border-slate-900 bg-gradient-to-br ${getGrad(selectedGroup.name)} text-base font-black text-white dark:border-white`}>
                    {selectedGroup.avatar ? <img src={selectedGroup.avatar} alt="" className="h-full w-full object-cover" /> : (selectedGroup.name?.[0] || 'G').toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <h3 className="truncate text-sm font-black text-slate-900 dark:text-white">{selectedGroup.name}</h3>
                    <p className="text-[10px] font-bold text-slate-400">{selectedGroup.members?.length} участников</p>
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
            <div className="flex flex-1 min-w-0 flex-col overflow-hidden bg-white dark:bg-slate-800">
              {/* Header */}
              <div className="flex flex-shrink-0 items-center gap-2 border-b-2 border-slate-200 px-3 py-3 dark:border-slate-700 sm:gap-3 sm:px-4">
                <button
                  onClick={resetGroupView}
                  className="inline-flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl border-2 border-slate-900 bg-white text-slate-900 transition active:translate-y-[2px] dark:border-white dark:bg-slate-900 dark:text-white lg:hidden"
                  style={{ boxShadow: '0 3px 0 #0f172a' }}
                  aria-label="Назад"
                >
                  <ArrowLeft size={15} strokeWidth={2.4} />
                </button>
                <div className={`flex h-9 w-9 flex-shrink-0 items-center justify-center overflow-hidden rounded-2xl border-2 border-slate-900 bg-gradient-to-br ${getGrad(selectedGroup.name)} text-xs font-black text-white dark:border-white lg:hidden`}>
                  {selectedGroup.avatar ? <img src={selectedGroup.avatar} alt="" className="h-full w-full object-cover" /> : (selectedGroup.name?.[0] || 'G').toUpperCase()}
                </div>
                <h2 className="min-w-0 flex-1 truncate text-sm font-black text-slate-900 dark:text-white">{selectedGroup.name}</h2>
              </div>

              {/* Tabs — horizontal scrollable chunky pills */}
              <div className="flex-shrink-0 border-b-2 border-slate-200 bg-slate-50/40 dark:border-slate-700 dark:bg-slate-900/30">
                <div className="no-scrollbar flex gap-1.5 overflow-x-auto px-3 py-2 sm:gap-2 sm:px-4">
                  {TABS.map(t => {
                    const isActive = activeTab === t.id;
                    return (
                      <button
                        key={t.id}
                        onClick={() => setActiveTab(t.id)}
                        className={`flex-shrink-0 inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border-2 px-3 py-1.5 text-[11px] font-black transition active:translate-y-[1px] sm:gap-2 sm:px-4 sm:py-2 sm:text-xs ${
                          isActive
                            ? 'border-slate-900 bg-primary-500 text-white dark:border-white'
                            : 'border-slate-900 bg-white text-slate-900 dark:border-white dark:bg-slate-800 dark:text-white'
                        }`}
                        style={{ boxShadow: isActive ? '0 3px 0 #9a3412' : '0 2px 0 #0f172a' }}
                      >
                        <t.icon size={13} strokeWidth={2.4} />
                        <span>{t.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Tab content */}
              {activeTab === 'chat' && (
                <div className="flex flex-1 flex-col overflow-hidden">
                  {/* Announcement banner */}
                  {(() => {
                    const ann = selectedGroup.announcement;
                    const canManage = hasPermission(selectedGroup, 'manageGroup');
                    const hasText = ann?.text && ann.text.trim().length > 0;
                    if (!hasText && !canManage) return null;
                    if (editingAnnouncement) {
                      return (
                        <div className="flex-shrink-0 border-b-2 border-amber-300 bg-amber-50 px-3 py-2.5 dark:border-amber-500/60 dark:bg-amber-950/30 sm:px-4">
                          <div className="mb-2 flex items-center gap-2">
                            <Megaphone size={14} strokeWidth={2.6} className="flex-shrink-0 text-amber-600 dark:text-amber-300" />
                            <p className="text-[10px] font-black uppercase tracking-widest text-amber-700 dark:text-amber-300">
                              Объявление
                            </p>
                          </div>
                          <textarea
                            autoFocus
                            value={announcementDraft}
                            onChange={(e) => setAnnouncementDraft(e.target.value.slice(0, 500))}
                            placeholder="Напиши важное объявление для участников..."
                            rows={2}
                            className="w-full resize-none rounded-xl border-2 border-amber-300 bg-white px-3 py-2 text-sm font-medium text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-amber-500 focus:ring-2 focus:ring-amber-100 dark:border-amber-500/40 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500"
                          />
                          <div className="mt-2 flex items-center justify-between gap-2">
                            <span className="text-[10px] font-bold text-amber-700/70 dark:text-amber-300/70">{announcementDraft.length}/500</span>
                            <div className="flex gap-1.5">
                              <button
                                onClick={() => { setEditingAnnouncement(false); setAnnouncementDraft(ann?.text || ''); }}
                                className="chunky-btn-ghost px-3 py-1.5 text-[11px]"
                              >
                                Отмена
                              </button>
                              <button
                                onClick={saveAnnouncement}
                                disabled={savingAnnouncement}
                                className="chunky-btn-primary inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px]"
                              >
                                <Save size={12} strokeWidth={2.6} />
                                {savingAnnouncement ? '...' : 'Сохранить'}
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    }
                    return (
                      <div className="flex-shrink-0 border-b-2 border-amber-300 bg-amber-50 px-3 py-2.5 dark:border-amber-500/60 dark:bg-amber-950/30 sm:px-4">
                        <div className="flex items-start gap-2.5">
                          <div
                            className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl border-2 border-amber-700 bg-amber-200 text-amber-800 dark:border-amber-300 dark:bg-amber-700/40 dark:text-amber-200"
                            style={{ boxShadow: '0 2px 0 #92400e' }}
                          >
                            <Megaphone size={14} strokeWidth={2.6} />
                          </div>
                          <div className="min-w-0 flex-1">
                            {hasText ? (
                              <p className="break-words text-xs font-bold text-amber-900 dark:text-amber-100 sm:text-sm">
                                {ann.text}
                              </p>
                            ) : (
                              <p className="text-[11px] font-medium italic text-amber-700/70 dark:text-amber-300/70">
                                Закрепи важное сообщение для участников
                              </p>
                            )}
                            {hasText && ann.updatedBy && (
                              <p className="mt-1 text-[10px] font-bold text-amber-700/70 dark:text-amber-300/70">
                                {ann.updatedBy.firstName} {ann.updatedBy.lastName}
                                {ann.updatedAt && ` · ${new Date(ann.updatedAt).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}`}
                              </p>
                            )}
                          </div>
                          {canManage && (
                            <button
                              onClick={() => { setEditingAnnouncement(true); setAnnouncementDraft(ann?.text || ''); }}
                              className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg border-2 border-amber-700 bg-white text-amber-700 transition active:translate-y-[1px] dark:border-amber-300 dark:bg-slate-900 dark:text-amber-300"
                              aria-label="Редактировать"
                              title="Редактировать"
                            >
                              <Edit3 size={12} strokeWidth={2.6} />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })()}

                  <MessageList
                    messages={messages}
                    currentUserId={currentUserId}
                    onReply={setReplyTo}
                    onDelete={deleteMessage}
                    onPin={pinMessage}
                    onRetry={retryMessage}
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
                <div className="flex-1 overflow-y-auto p-4 sm:p-5">
                  <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-xs font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">
                      Участники ({selectedGroup.members?.length || 0})
                    </p>
                    <div className="relative w-full sm:max-w-xs">
                      <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" strokeWidth={2.4} />
                      <input
                        type="text"
                        value={memberSearchQuery}
                        onChange={(e) => setMemberSearchQuery(e.target.value)}
                        placeholder="Поиск участника..."
                        className="w-full rounded-xl border-2 border-slate-300 bg-white py-2 pl-9 pr-9 text-xs font-medium text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-primary-500 focus:ring-2 focus:ring-primary-100 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500"
                      />
                      {memberSearchQuery && (
                        <button
                          type="button"
                          onClick={() => setMemberSearchQuery('')}
                          className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-700"
                          aria-label="Очистить"
                        >
                          <X size={12} />
                        </button>
                      )}
                    </div>
                  </div>
                  {filteredMembers.length === 0 && memberSearchQuery && (
                    <div className="py-8 text-center">
                      <p className="text-xs font-bold text-slate-400">Никого не найдено по «{memberSearchQuery}»</p>
                    </div>
                  )}
                  <div className="space-y-1">
                    {filteredMembers.map(m => {
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
                            <p
                              onClick={() => m.user?._id && navigate(`/profile/${m.user._id}`)}
                              className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate transition hover:text-primary-600"
                            >
                              {m.user?.lastName} {m.user?.firstName}
                            </p>
                            <p className="text-xs font-semibold text-primary-500 dark:text-primary-300 truncate">{m.user?.username ? `@${m.user.username}` : `#${(m.user?.uniqueId || '').slice(0, 6)}`}</p>
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
                    <EmptyState caption="Нет тестов" />
                  ) : (
                    <div className="space-y-2">
                      {selectedGroup.assignedTests?.map(at => (
                        <div key={at.test?._id || at._id} className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 dark:border-slate-700 hover:border-gray-200 dark:hover:border-slate-600 transition">
                          <div className="w-9 h-9 rounded-lg bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center"><BookOpen size={16} className="text-amber-500" /></div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{at.test?.title || 'Удалённый тест'}</p>
                            <p className="text-xs text-gray-400">{at.test?.totalPoints || 0} баллов</p>
                          </div>
                          {hasPermission(selectedGroup, 'launchArenas') && at.test?._id && (
                            <button
                              onClick={() => launchArenaFromGroup(at.test._id)}
                              className="inline-flex items-center gap-1 rounded-lg border border-orange-200 bg-orange-50 px-3 py-1.5 text-xs font-semibold text-orange-600 transition hover:bg-orange-100 dark:border-orange-900/30 dark:bg-orange-900/10 dark:text-orange-300"
                            >
                              <Swords size={12} /> Arena
                            </button>
                          )}
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

              {activeTab === 'stats' && (
                <div className="flex-1 overflow-y-auto p-4 sm:p-5">
                  {statsLoading ? (
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 [&>*]:min-w-0">
                      {[1, 2, 3, 4].map(i => (
                        <div key={i} className="chunky-card animate-pulse p-4">
                          <div className="h-3 w-2/3 rounded bg-slate-200 dark:bg-slate-700" />
                          <div className="mt-2 h-6 w-1/2 rounded bg-slate-300 dark:bg-slate-600" />
                        </div>
                      ))}
                    </div>
                  ) : !groupStats ? (
                    <div className="chunky-card p-10 text-center">
                      <div
                        className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border-2 border-slate-900 bg-slate-50 text-slate-400 dark:border-white dark:bg-slate-900/30"
                        style={{ boxShadow: '0 3px 0 #0f172a' }}
                      >
                        <BarChart3 size={26} strokeWidth={2.2} />
                      </div>
                      <p className="text-sm font-black text-slate-900 dark:text-white">Нет данных</p>
                      <p className="mt-1 text-xs font-medium text-slate-500 dark:text-slate-400">
                        Назначь тесты группе и попроси участников их пройти
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-5">
                      {/* Big metric tiles */}
                      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 [&>*]:min-w-0">
                        {[
                          { icon: Users, label: 'Участников', value: groupStats.totalMembers, color: 'text-blue-600 dark:text-blue-300', bg: 'bg-blue-50 dark:bg-blue-900/20' },
                          { icon: BookOpen, label: 'Назначено тестов', value: groupStats.totalAssignedTests, color: 'text-emerald-600 dark:text-emerald-300', bg: 'bg-emerald-50 dark:bg-emerald-900/20' },
                          { icon: TrendingUp, label: 'Прохождений', value: groupStats.totalAttempts, color: 'text-primary-600 dark:text-primary-300', bg: 'bg-primary-50 dark:bg-primary-900/20' },
                          { icon: BarChart3, label: 'Средний %', value: groupStats.avgScore == null ? '—' : `${groupStats.avgScore}%`, color: 'text-amber-600 dark:text-amber-300', bg: 'bg-amber-50 dark:bg-amber-900/20' },
                        ].map((s, i) => (
                          <div key={i} className="chunky-card p-4">
                            <div className={`mb-2 inline-flex h-9 w-9 items-center justify-center rounded-xl border-2 border-slate-900 ${s.bg} ${s.color} dark:border-white`} style={{ boxShadow: '0 2px 0 #0f172a' }}>
                              <s.icon size={15} strokeWidth={2.4} />
                            </div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">{s.label}</p>
                            <p className="mt-0.5 text-2xl font-black text-slate-900 dark:text-white">{s.value}</p>
                          </div>
                        ))}
                      </div>

                      {/* Activity sparkline (last 7 days) */}
                      {groupStats.activity7d && groupStats.activity7d.length > 0 && (
                        <div className="chunky-card p-4 sm:p-5">
                          <div className="mb-3 flex items-center justify-between gap-3">
                            <p className="text-xs font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">
                              Сообщения · последние 7 дней
                            </p>
                            <p className="text-xs font-bold text-slate-700 dark:text-slate-200">
                              Всего {groupStats.totalMessages}
                            </p>
                          </div>
                          {(() => {
                            const max = Math.max(1, ...groupStats.activity7d.map(d => d.count));
                            return (
                              <div className="flex h-24 items-end gap-1.5">
                                {groupStats.activity7d.map((d) => {
                                  const h = Math.max(2, Math.round((d.count / max) * 100));
                                  const dayLabel = new Date(d.date).toLocaleDateString('ru-RU', { weekday: 'short' });
                                  return (
                                    <div key={d.date} className="flex flex-1 flex-col items-center gap-1">
                                      <div className="flex h-full w-full items-end">
                                        <div
                                          className="w-full rounded-t-md border-2 border-slate-900 bg-primary-500 dark:border-white"
                                          style={{ height: `${h}%`, boxShadow: '0 2px 0 #9a3412', minHeight: '4px' }}
                                          title={`${d.count} сообщ.`}
                                        />
                                      </div>
                                      <span className="text-[9px] font-bold text-slate-400">{dayLabel}</span>
                                    </div>
                                  );
                                })}
                              </div>
                            );
                          })()}
                        </div>
                      )}

                      {/* Top performers */}
                      {groupStats.topPerformers && groupStats.topPerformers.length > 0 && (
                        <div className="chunky-card p-4 sm:p-5">
                          <div className="mb-3 flex items-center gap-2">
                            <Trophy size={14} strokeWidth={2.6} className="text-amber-500" />
                            <p className="text-xs font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">
                              Топ участников
                            </p>
                          </div>
                          <div className="space-y-2">
                            {groupStats.topPerformers.map((p, idx) => {
                              const medalColors = ['bg-amber-400 text-amber-900', 'bg-slate-300 text-slate-800', 'bg-orange-400 text-orange-900'];
                              const medalCls = idx < 3 ? medalColors[idx] : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300';
                              return (
                                <button
                                  key={p.user?._id || idx}
                                  onClick={() => p.user?._id && navigate(`/profile/${p.user._id}`)}
                                  className="flex w-full items-center gap-3 rounded-xl border-2 border-slate-200 bg-white p-2.5 text-left transition hover:border-slate-300 active:translate-y-[1px] dark:border-slate-700 dark:bg-slate-800 dark:hover:border-slate-500"
                                >
                                  <div className={`flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-[11px] font-black ${medalCls}`}>
                                    {idx + 1}
                                  </div>
                                  <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-slate-900 bg-slate-100 text-xs font-black text-slate-600 dark:border-white dark:bg-slate-700 dark:text-slate-300">
                                    {p.user?.avatar ? <img src={p.user.avatar} alt="" className="h-full w-full object-cover" /> : (p.user?.firstName?.[0] || '?').toUpperCase()}
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <p className="truncate text-sm font-bold text-slate-900 dark:text-white">
                                      {p.user?.firstName} {p.user?.lastName}
                                    </p>
                                    <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                                      {p.attempts} прохожд. · средн. <span className="text-primary-600 dark:text-primary-300">{p.avgPercentage}%</span>
                                    </p>
                                  </div>
                                  <span
                                    className="rounded-full border-2 border-slate-900 bg-emerald-50 px-2 py-0.5 text-[10px] font-black text-emerald-700 dark:border-white dark:bg-emerald-900/30 dark:text-emerald-300"
                                    style={{ boxShadow: '0 2px 0 #065f46' }}
                                  >
                                    лучш. {p.bestPercentage}%
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Per-test stats */}
                      {groupStats.testStats && groupStats.testStats.length > 0 && (
                        <div className="chunky-card p-4 sm:p-5">
                          <div className="mb-3 flex items-center gap-2">
                            <BookOpen size={14} strokeWidth={2.6} className="text-emerald-500" />
                            <p className="text-xs font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">
                              По тестам
                            </p>
                          </div>
                          <div className="space-y-2">
                            {groupStats.testStats.map((t, idx) => (
                              <div key={t.test?._id || idx} className="flex items-center gap-3 rounded-xl border-2 border-slate-200 bg-white p-2.5 dark:border-slate-700 dark:bg-slate-800">
                                <div className="min-w-0 flex-1">
                                  <p className="truncate text-sm font-bold text-slate-900 dark:text-white">{t.test?.title || 'Тест'}</p>
                                  <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                                    {t.attempts} прохожд. · {t.uniqueParticipants} участн.
                                  </p>
                                </div>
                                <div className="flex flex-col items-end">
                                  <p className="text-base font-black text-primary-600 dark:text-primary-300">{t.avgPercentage}%</p>
                                  <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400">средн.</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'settings' && (
                <div className="flex-1 overflow-y-auto p-5 space-y-6">
                  {/* Basic settings */}
                  {hasPermission(selectedGroup, 'manageGroup') && (
                    <div className="chunky-card p-5 space-y-4">
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
                    <div className="chunky-card p-5">
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
                    <div className="chunky-card p-5">
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
                    <div className="chunky-card p-5">
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
                                  <p
                                    onClick={() => entry.user?._id && navigate(`/profile/${entry.user._id}`)}
                                    className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate transition hover:text-primary-600"
                                  >
                                    {entry.user?.lastName} {entry.user?.firstName}
                                  </p>
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
          <div className="space-y-5">
            <button
              onClick={() => navigate(-1)}
              className="inline-flex items-center gap-1.5 rounded-xl border-2 border-slate-900 bg-white px-3 py-1.5 text-xs font-black text-slate-900 transition active:translate-y-[2px] dark:border-white dark:bg-slate-900 dark:text-white"
              style={{ boxShadow: '0 3px 0 #0f172a' }}
            >
              <ArrowLeft size={13} strokeWidth={2.4} /> Назад
            </button>

            {/* Hero */}
            <AnimatedHero
              preset="paperSage"
              height="md"
              eyebrow="Communities"
              icon={<Users size={22} />}
              title="Группы"
              subtitle={`Коммьюнити для совместной подготовки, дискуссий и обмена тестами. У тебя ${groups.length} групп.`}
              stats={groups.length > 0 ? [
                { icon: <Users size={14} />, label: 'Групп', value: groups.length },
                { icon: <BookOpen size={14} />, label: 'Тестов', value: groups.reduce((s, g) => s + (g.assignedTests?.length || 0), 0) }
              ] : undefined}
              actions={
                <>
                  <button
                    onClick={() => setShowJoin(true)}
                    className="chunky-btn-ghost inline-flex items-center gap-2 px-4 py-2 text-xs"
                  >
                    <UserPlus size={14} strokeWidth={2.4} /> Вступить
                  </button>
                  <button
                    onClick={() => setShowCreate(true)}
                    className="chunky-btn-primary inline-flex items-center gap-2 px-4 py-2 text-xs"
                  >
                    <Plus size={14} strokeWidth={2.4} /> Создать
                  </button>
                </>
              }
            />

            {loading ? (
              <div className="grid gap-3 md:grid-cols-2">{[1,2,3,4].map(i => (<div key={i} className="chunky-card p-5 animate-pulse"><div className="flex items-center gap-4"><div className="w-12 h-12 rounded-full bg-gray-200 dark:bg-slate-700" /><div className="flex-1"><div className="h-4 bg-gray-200 dark:bg-slate-700 rounded w-1/3 mb-2" /><div className="h-3 bg-gray-100 dark:bg-slate-700 rounded w-1/4" /></div></div></div>))}</div>
            ) : groups.length === 0 ? (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="chunky-card p-10 text-center">
                <div
                  className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border-2 border-slate-900 bg-primary-50 text-primary-500 dark:border-white dark:bg-primary-900/20 dark:text-primary-300"
                  style={{ boxShadow: '0 3px 0 #0f172a' }}
                >
                  <Users size={28} strokeWidth={2.2} />
                </div>
                <h3 className="text-lg font-black text-slate-900 dark:text-white">Нет групп</h3>
                <p className="mt-1 text-sm font-medium text-slate-500 dark:text-slate-400">Создай группу или вступи по коду</p>
                <div className="mt-5 flex justify-center gap-2">
                  <button onClick={() => setShowJoin(true)} className="chunky-btn-ghost inline-flex items-center gap-2 px-4 py-2 text-xs">
                    <UserPlus size={14} strokeWidth={2.4} /> Вступить
                  </button>
                  <button onClick={() => setShowCreate(true)} className="chunky-btn-primary inline-flex items-center gap-2 px-4 py-2 text-xs">
                    <Plus size={14} strokeWidth={2.4} /> Создать
                  </button>
                </div>
              </motion.div>
            ) : (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="grid gap-3 md:grid-cols-2 [&>*]:min-w-0">
                {groups.map((g, i) => (
                  <motion.button
                    key={g._id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.04 }}
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
                    }}
                    className="group chunky-card flex w-full cursor-pointer items-center gap-4 p-4 text-left transition-transform hover:-translate-y-0.5 active:translate-y-[2px] sm:p-5"
                  >
                    <div className={`flex h-14 w-14 flex-shrink-0 items-center justify-center overflow-hidden rounded-2xl border-2 border-slate-900 bg-gradient-to-br ${getGrad(g.name)} text-xl font-black text-white dark:border-white`}>
                      {g.avatar ? <img src={g.avatar} alt="" className="h-full w-full object-cover" /> : (g.name?.[0] || 'G').toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="truncate text-sm font-black text-slate-900 transition group-hover:text-primary-600 dark:text-white dark:group-hover:text-primary-400 sm:text-base">{g.name}</h3>
                        {isOwner(g) && (
                          <span
                            className="flex-shrink-0 rounded-full border-2 border-slate-900 bg-red-50 px-2 py-0.5 text-[9px] font-black text-red-600 dark:border-white dark:bg-red-900/30 dark:text-red-300"
                            style={{ boxShadow: '0 2px 0 #7f1d1d' }}
                          >
                            OWNER
                          </span>
                        )}
                      </div>
                      <div className="mt-1.5 flex items-center gap-3 text-[11px] font-bold text-slate-500 dark:text-slate-400">
                        <span className="inline-flex items-center gap-1"><Users size={12} strokeWidth={2.4} /> {g.members?.length}</span>
                        <span className="inline-flex items-center gap-1"><BookOpen size={12} strokeWidth={2.4} /> {g.assignedTests?.length || 0}</span>
                      </div>
                    </div>
                  </motion.button>
                ))}
              </motion.div>
            )}
          </div>
        )}

        {/* ── Modals ── */}
        {/* Create */}
        <AnimatePresence>
          {showCreate && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={() => setShowCreate(false)}>
              <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="chunky-card p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
                <div className="mb-5 flex items-start gap-3">
                  <div
                    className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl border-2 border-slate-900 bg-primary-50 text-primary-500 dark:border-white dark:bg-primary-900/20 dark:text-primary-300"
                    style={{ boxShadow: '0 3px 0 #9a3412' }}
                  >
                    <Plus size={20} strokeWidth={2.4} />
                  </div>
                  <div className="flex-1">
                    <p className="text-[10px] font-black uppercase tracking-widest text-primary-500">New community</p>
                    <h3 className="mt-1 text-lg font-black text-slate-900 dark:text-white">Создать группу</h3>
                  </div>
                </div>
                <div className="mb-5 space-y-3">
                  <div>
                    <label className="mb-1 block text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">Название</label>
                    <input className="w-full rounded-xl border-2 border-slate-300 bg-white px-3.5 py-2.5 text-sm font-medium text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-primary-500 focus:ring-2 focus:ring-primary-100 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500" placeholder="Математика 101" value={createForm.name} onChange={e => setCreateForm(p => ({ ...p, name: e.target.value }))} autoFocus />
                  </div>
                  <div>
                    <label className="mb-1 block text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">Описание</label>
                    <textarea className="w-full resize-none rounded-xl border-2 border-slate-300 bg-white px-3.5 py-2.5 text-sm font-medium text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-primary-500 focus:ring-2 focus:ring-primary-100 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500" rows={3} placeholder="Необязательно" value={createForm.description} onChange={e => setCreateForm(p => ({ ...p, description: e.target.value }))} />
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <button onClick={() => setShowCreate(false)} className="chunky-btn-ghost px-4 py-2 text-xs">Отмена</button>
                  <button onClick={createGroup} disabled={submitting} className="chunky-btn-primary px-5 py-2 text-xs">{submitting ? '...' : 'Создать'}</button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Join */}
        <AnimatePresence>
          {showJoin && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={() => { setShowJoin(false); setNeedsPassword(false); }}>
              <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="chunky-card p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
                <div className="mb-5 flex items-start gap-3">
                  <div
                    className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl border-2 border-slate-900 bg-emerald-50 text-emerald-600 dark:border-white dark:bg-emerald-900/20 dark:text-emerald-300"
                    style={{ boxShadow: '0 3px 0 #065f46' }}
                  >
                    <UserPlus size={20} strokeWidth={2.4} />
                  </div>
                  <div className="flex-1">
                    <p className="text-[10px] font-black uppercase tracking-widest text-emerald-500">Join group</p>
                    <h3 className="mt-1 text-lg font-black text-slate-900 dark:text-white">Присоединиться</h3>
                  </div>
                </div>
                <div className="mb-5 space-y-3">
                  <div>
                    <label className="mb-1 block text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">Код приглашения</label>
                    <input className="w-full rounded-xl border-2 border-slate-300 bg-white px-3.5 py-2.5 font-mono text-sm font-bold uppercase text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-primary-500 focus:ring-2 focus:ring-primary-100 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500" placeholder="abc123" value={joinCode} onChange={e => setJoinCode(e.target.value)} autoFocus />
                  </div>
                  {needsPassword && (
                    <div>
                      <label className="mb-1 block text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">Пароль группы</label>
                      <input type="password" className="w-full rounded-xl border-2 border-slate-300 bg-white px-3.5 py-2.5 text-sm font-medium text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-primary-500 focus:ring-2 focus:ring-primary-100 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500" placeholder="Введите пароль" value={joinPassword} onChange={e => setJoinPassword(e.target.value)} />
                    </div>
                  )}
                </div>
                <div className="flex justify-end gap-2">
                  <button onClick={() => { setShowJoin(false); setNeedsPassword(false); }} className="chunky-btn-ghost px-4 py-2 text-xs">Отмена</button>
                  <button onClick={joinGroup} disabled={submitting} className="chunky-btn-success px-5 py-2 text-xs">{submitting ? '...' : 'Вступить'}</button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Assign test */}
        <AnimatePresence>
          {showAssignTest && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={() => setShowAssignTest(false)}>
              <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="chunky-card p-6 w-full max-w-md max-h-[70vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
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
