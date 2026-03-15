const express = require('express');
const Group = require('../models/Group');
const Test = require('../models/Test');
const User = require('../models/User');
const { auth } = require('../middleware/auth');

const router = express.Router();

// Create group
router.post('/', auth, async (req, res) => {
  try {
    const { name, description } = req.body;
    if (!name?.trim()) return res.status(400).json({ message: 'Название обязательно' });

    const group = new Group({
      name: name.trim(),
      description: description?.trim() || '',
      creator: req.user._id,
      members: [{ user: req.user._id, role: 'admin' }]
    });

    await group.save();
    await group.populate('members.user', 'firstName lastName email avatar');
    res.status(201).json(group);
  } catch (error) {
    res.status(500).json({ message: 'Ошибка создания группы', error: error.message });
  }
});

// Get my groups (created + joined)
router.get('/my', auth, async (req, res) => {
  try {
    const groups = await Group.find({
      isDeleted: false,
      'members.user': req.user._id
    })
      .populate('creator', 'firstName lastName avatar')
      .populate('members.user', 'firstName lastName email avatar')
      .populate('assignedTests.test', 'title shareLink totalPoints')
      .sort({ updatedAt: -1 });

    res.json(groups);
  } catch (error) {
    res.status(500).json({ message: 'Ошибка', error: error.message });
  }
});

// Get single group
router.get('/:id', auth, async (req, res) => {
  try {
    const group = await Group.findById(req.params.id)
      .populate('creator', 'firstName lastName avatar')
      .populate('members.user', 'firstName lastName email avatar')
      .populate('assignedTests.test', 'title shareLink totalPoints attemptCount averageScore');

    if (!group || group.isDeleted) return res.status(404).json({ message: 'Группа не найдена' });

    // Check membership
    const isMember = group.members.some(m => m.user._id.toString() === req.user._id.toString());
    if (!isMember) return res.status(403).json({ message: 'Вы не являетесь участником группы' });

    res.json(group);
  } catch (error) {
    res.status(500).json({ message: 'Ошибка', error: error.message });
  }
});

// Join group by invite code
router.post('/join/:code', auth, async (req, res) => {
  try {
    const group = await Group.findOne({ inviteCode: req.params.code, isDeleted: false });
    if (!group) return res.status(404).json({ message: 'Группа не найдена. Проверьте код приглашения.' });

    const alreadyMember = group.members.some(m => m.user.toString() === req.user._id.toString());
    if (alreadyMember) return res.status(400).json({ message: 'Вы уже в этой группе' });

    group.members.push({ user: req.user._id, role: 'member' });
    await group.save();

    await group.populate('members.user', 'firstName lastName email avatar');
    await group.populate('creator', 'firstName lastName avatar');
    await group.populate('assignedTests.test', 'title shareLink totalPoints');

    res.json(group);
  } catch (error) {
    res.status(500).json({ message: 'Ошибка', error: error.message });
  }
});

// Update group (name, description) — admin only
router.put('/:id', auth, async (req, res) => {
  try {
    const group = await Group.findById(req.params.id);
    if (!group || group.isDeleted) return res.status(404).json({ message: 'Группа не найдена' });
    if (group.creator.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Только создатель может редактировать группу' });
    }

    if (req.body.name) group.name = req.body.name.trim();
    if (req.body.description !== undefined) group.description = req.body.description.trim();
    await group.save();
    res.json(group);
  } catch (error) {
    res.status(500).json({ message: 'Ошибка', error: error.message });
  }
});

// Delete group (soft delete) — admin only
router.delete('/:id', auth, async (req, res) => {
  try {
    const group = await Group.findById(req.params.id);
    if (!group) return res.status(404).json({ message: 'Группа не найдена' });
    if (group.creator.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Только создатель может удалить группу' });
    }

    group.isDeleted = true;
    await group.save();
    res.json({ message: 'Группа удалена' });
  } catch (error) {
    res.status(500).json({ message: 'Ошибка', error: error.message });
  }
});

// Remove member — admin only
router.delete('/:id/members/:userId', auth, async (req, res) => {
  try {
    const group = await Group.findById(req.params.id);
    if (!group || group.isDeleted) return res.status(404).json({ message: 'Группа не найдена' });
    if (group.creator.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Только создатель может удалять участников' });
    }
    if (req.params.userId === req.user._id.toString()) {
      return res.status(400).json({ message: 'Нельзя удалить себя из группы' });
    }

    group.members = group.members.filter(m => m.user.toString() !== req.params.userId);
    await group.save();
    res.json({ message: 'Участник удалён' });
  } catch (error) {
    res.status(500).json({ message: 'Ошибка', error: error.message });
  }
});

// Leave group
router.post('/:id/leave', auth, async (req, res) => {
  try {
    const group = await Group.findById(req.params.id);
    if (!group || group.isDeleted) return res.status(404).json({ message: 'Группа не найдена' });
    if (group.creator.toString() === req.user._id.toString()) {
      return res.status(400).json({ message: 'Создатель не может покинуть группу. Удалите группу вместо этого.' });
    }

    group.members = group.members.filter(m => m.user.toString() !== req.user._id.toString());
    await group.save();
    res.json({ message: 'Вы вышли из группы' });
  } catch (error) {
    res.status(500).json({ message: 'Ошибка', error: error.message });
  }
});

// Assign test to group — admin only
router.post('/:id/assign-test', auth, async (req, res) => {
  try {
    const { testId, deadline } = req.body;
    const group = await Group.findById(req.params.id);
    if (!group || group.isDeleted) return res.status(404).json({ message: 'Группа не найдена' });
    if (group.creator.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Только создатель может назначать тесты' });
    }

    const test = await Test.findById(testId);
    if (!test) return res.status(404).json({ message: 'Тест не найден' });

    // Check if already assigned
    const already = group.assignedTests.some(at => at.test.toString() === testId);
    if (already) return res.status(400).json({ message: 'Тест уже назначен этой группе' });

    group.assignedTests.push({
      test: testId,
      deadline: deadline || null
    });
    await group.save();

    await group.populate('assignedTests.test', 'title shareLink totalPoints attemptCount averageScore');
    res.json(group);
  } catch (error) {
    res.status(500).json({ message: 'Ошибка', error: error.message });
  }
});

// Remove assigned test — admin only
router.delete('/:id/assigned-tests/:testId', auth, async (req, res) => {
  try {
    const group = await Group.findById(req.params.id);
    if (!group || group.isDeleted) return res.status(404).json({ message: 'Группа не найдена' });
    if (group.creator.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Только создатель может убирать тесты' });
    }

    group.assignedTests = group.assignedTests.filter(at => at.test.toString() !== req.params.testId);
    await group.save();
    res.json({ message: 'Тест убран из группы' });
  } catch (error) {
    res.status(500).json({ message: 'Ошибка', error: error.message });
  }
});

// Regenerate invite code — admin only
router.post('/:id/regenerate-code', auth, async (req, res) => {
  try {
    const group = await Group.findById(req.params.id);
    if (!group || group.isDeleted) return res.status(404).json({ message: 'Группа не найдена' });
    if (group.creator.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Только создатель может обновлять код' });
    }

    const { v4: uuidv4 } = require('uuid');
    group.inviteCode = uuidv4().slice(0, 8);
    await group.save();
    res.json({ inviteCode: group.inviteCode });
  } catch (error) {
    res.status(500).json({ message: 'Ошибка', error: error.message });
  }
});

// ─── Group Chat Messages ───

// Get messages for a group (last 100)
router.get('/:id/messages', auth, async (req, res) => {
  try {
    const GroupMessage = require('../models/GroupMessage');
    const group = await Group.findById(req.params.id);
    if (!group || group.isDeleted) return res.status(404).json({ message: 'Группа не найдена' });

    const isMember = group.members.some(m => m.user.toString() === req.user._id.toString());
    if (!isMember) return res.status(403).json({ message: 'Вы не являетесь участником группы' });

    const messages = await GroupMessage.find({ group: req.params.id, isDeleted: false })
      .populate('user', 'firstName lastName avatar')
      .sort({ createdAt: -1 })
      .limit(100);

    res.json(messages.reverse());
  } catch (error) {
    res.status(500).json({ message: 'Ошибка', error: error.message });
  }
});

// Send message to group
router.post('/:id/messages', auth, async (req, res) => {
  try {
    const GroupMessage = require('../models/GroupMessage');
    const { text } = req.body;
    if (!text?.trim()) return res.status(400).json({ message: 'Текст обязателен' });

    const group = await Group.findById(req.params.id);
    if (!group || group.isDeleted) return res.status(404).json({ message: 'Группа не найдена' });

    const isMember = group.members.some(m => m.user.toString() === req.user._id.toString());
    if (!isMember) return res.status(403).json({ message: 'Вы не являетесь участником группы' });

    const message = new GroupMessage({
      group: req.params.id,
      user: req.user._id,
      text: text.trim()
    });
    await message.save();
    await message.populate('user', 'firstName lastName avatar');

    res.status(201).json(message);
  } catch (error) {
    res.status(500).json({ message: 'Ошибка', error: error.message });
  }
});

module.exports = router;
