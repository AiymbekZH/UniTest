const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

// Default roles created with every new group
function defaultRoles() {
  return [
    {
      _id: 'owner',
      name: 'Владелец',
      color: '#ef4444',
      position: 1000,
      permissions: {
        sendMessages: true,
        deleteMessages: true,
        kickMembers: true,
        banMembers: true,
        manageRoles: true,
        manageGroup: true,
        assignTests: true,
        pinMessages: true,
        launchArenas: true,
      }
    },
    {
      _id: 'admin',
      name: 'Админ',
      color: '#f59e0b',
      position: 500,
      permissions: {
        sendMessages: true,
        deleteMessages: true,
        kickMembers: true,
        banMembers: false,
        manageRoles: false,
        manageGroup: true,
        assignTests: true,
        pinMessages: true,
        launchArenas: true,
      }
    },
    {
      _id: 'member',
      name: 'Участник',
      color: '#6366f1',
      position: 0,
      permissions: {
        sendMessages: true,
        deleteMessages: false,
        kickMembers: false,
        banMembers: false,
        manageRoles: false,
        manageGroup: false,
        assignTests: false,
        pinMessages: false,
        launchArenas: false,
      }
    }
  ];
}

const permissionSchema = new mongoose.Schema({
  sendMessages: { type: Boolean, default: true },
  deleteMessages: { type: Boolean, default: false },
  kickMembers: { type: Boolean, default: false },
  banMembers: { type: Boolean, default: false },
  manageRoles: { type: Boolean, default: false },
  manageGroup: { type: Boolean, default: false },
  assignTests: { type: Boolean, default: false },
  pinMessages: { type: Boolean, default: false },
  launchArenas: { type: Boolean, default: false },
}, { _id: false });

const roleSchema = new mongoose.Schema({
  _id: { type: String, default: () => uuidv4().slice(0, 8) },
  name: { type: String, required: true },
  color: { type: String, default: '#6366f1' },
  position: { type: Number, default: 0 },
  permissions: { type: permissionSchema, default: () => ({}) },
}, { _id: false });

const groupSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  description: { type: String, default: '', trim: true },
  avatar: { type: String, default: '' },
  creator: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  inviteCode: { type: String, unique: true, default: () => uuidv4().slice(0, 8) },

  // Privacy
  isPrivate: { type: Boolean, default: false },
  password: { type: String, default: '' },

  // Pinned announcement banner shown above chat
  announcement: {
    text: { type: String, default: '', trim: true, maxlength: 500 },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    updatedAt: { type: Date, default: null },
  },

  // Members with role reference
  members: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    roleId: { type: String, default: 'member' },
    joinedAt: { type: Date, default: Date.now },
    lastReadAt: { type: Date, default: Date.now }
  }],

  bannedMembers: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    bannedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    bannedAt: { type: Date, default: Date.now }
  }],

  // Custom roles (Discord-style)
  roles: { type: [roleSchema], default: defaultRoles },

  assignedTests: [{
    test: { type: mongoose.Schema.Types.ObjectId, ref: 'Test' },
    assignedAt: { type: Date, default: Date.now },
    deadline: { type: Date, default: null }
  }],

  isDeleted: { type: Boolean, default: false }
}, { timestamps: true });

groupSchema.index({ creator: 1 });
groupSchema.index({ 'members.user': 1 });
groupSchema.index({ 'bannedMembers.user': 1 });

// Helper: get member's role object
groupSchema.methods.getMemberRole = function(userId) {
  const member = this.members.find(m => m.user.toString() === userId.toString());
  if (!member) return null;
  return this.roles.find(r => r._id === member.roleId) || this.roles.find(r => r._id === 'member');
};

// Helper: check if user has permission
groupSchema.methods.hasPermission = function(userId, permission) {
  const role = this.getMemberRole(userId);
  if (!role) return false;
  if (permission === 'launchArenas' && role.permissions?.launchArenas === undefined) {
    return role._id === 'owner' || role._id === 'admin';
  }
  return role.permissions?.[permission] === true;
};

// Helper: check if user is owner
groupSchema.methods.isOwner = function(userId) {
  const member = this.members.find(m => m.user.toString() === userId.toString());
  return member?.roleId === 'owner';
};

module.exports = mongoose.model('Group', groupSchema);
