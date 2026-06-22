const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const { Conversation, Message, Listing } = require('../models');
const { notifyUser } = require('../services/push.service');
const { isUserOnline } = require('../realtime');

function readUnread(raw, key) {
  if (!raw) return 0;
  if (typeof raw.get === 'function') return raw.get(String(key)) || 0;
  return raw[String(key)] || 0;
}
function isParticipant(conv, me) {
  // participants xom ObjectId yoki populate qilingan hujjat bo'lishi mumkin
  return (conv.participants || []).some((p) => String(p && p._id ? p._id : p) === String(me));
}

// GET /chat/conversations
const listConversations = asyncHandler(async (req, res) => {
  const me = req.user.id;
  const convs = await Conversation.find({ participants: me })
    .sort({ updatedAt: -1 })
    .populate('participants', 'name sellerProfile')
    .populate('listingId', 'title photos price')
    .lean();

  const items = convs.map((c) => {
    const other = (c.participants || []).find((p) => String(p._id) !== String(me));
    return {
      _id: c._id,
      listing: c.listingId || null,
      other: other
        ? { _id: other._id, name: other.name, shopName: other.sellerProfile && other.sellerProfile.shopName }
        : null,
      lastMessage: c.lastMessage && c.lastMessage.at ? c.lastMessage : null,
      unread: readUnread(c.unread, me),
      updatedAt: c.updatedAt,
    };
  });
  res.json({ items });
});

// POST /chat/conversations  { listingId } -> suhbatni topadi yoki yaratadi
const getOrCreateConversation = asyncHandler(async (req, res) => {
  const me = req.user.id;
  const { listingId } = req.body;
  if (!listingId) throw ApiError.badRequest('listingId majburiy');

  const listing = await Listing.findById(listingId).select('sellerId title');
  if (!listing) throw ApiError.notFound("E'lon topilmadi");
  const sellerId = String(listing.sellerId);
  if (sellerId === String(me)) throw ApiError.badRequest("O'z e'loningizga yozib bo'lmaydi");

  let conv = await Conversation.findOne({ listingId, participants: { $all: [me, sellerId] } });
  if (!conv) conv = await Conversation.create({ participants: [me, sellerId], listingId });

  res.json({ conversationId: conv._id });
});

// GET /chat/conversations/:id  -> suhbat sarlavhasi uchun suhbatdosh ma'lumoti
const getConversation = asyncHandler(async (req, res) => {
  const me = req.user.id;
  const conv = await Conversation.findById(req.params.id)
    .populate('participants', 'name phone sellerProfile lastSeen')
    .populate('listingId', 'title photos price')
    .lean();
  if (!conv || !isParticipant(conv, me)) throw ApiError.notFound('Suhbat topilmadi');

  const other = (conv.participants || []).find((p) => String(p._id) !== String(me));
  res.json({
    conversation: {
      _id: conv._id,
      listing: conv.listingId || null,
      other: other
        ? {
            _id: other._id,
            name: other.name,
            phone: other.phone,
            shopName: other.sellerProfile && other.sellerProfile.shopName,
            online: isUserOnline(other._id),
            lastSeen: other.lastSeen || null,
          }
        : null,
    },
  });
});

// GET /chat/conversations/:id/messages?before=ISO
const getMessages = asyncHandler(async (req, res) => {
  const me = req.user.id;
  const conv = await Conversation.findById(req.params.id);
  if (!conv || !isParticipant(conv, me)) throw ApiError.notFound('Suhbat topilmadi');

  const limit = Math.min(Number(req.query.limit) || 30, 50);
  const filter = { conversationId: conv._id };
  if (req.query.before) filter.createdAt = { $lt: new Date(req.query.before) };

  const messages = await Message.find(filter).sort({ createdAt: -1 }).limit(limit).lean();

  // O'qildi deb belgilash
  conv.unread.set(String(me), 0);
  await conv.save();
  await Message.updateMany(
    { conversationId: conv._id, senderId: { $ne: me }, readBy: { $ne: me } },
    { $addToSet: { readBy: me } }
  );

  res.json({ items: messages.reverse() }); // eski -> yangi
});

// POST /chat/conversations/:id/messages  { text }
const sendMessage = asyncHandler(async (req, res) => {
  const me = req.user.id;
  const { text } = req.body;
  if (!text || !text.trim()) throw ApiError.badRequest("Xabar bo'sh bo'lishi mumkin emas");

  const conv = await Conversation.findById(req.params.id);
  if (!conv || !isParticipant(conv, me)) throw ApiError.notFound('Suhbat topilmadi');
  const recipient = conv.participants.map(String).find((p) => p !== String(me));

  const msg = await Message.create({ conversationId: conv._id, senderId: me, text: text.trim(), readBy: [me] });

  conv.lastMessage = { text: msg.text, senderId: me, at: msg.createdAt };
  conv.unread.set(String(recipient), readUnread(conv.unread, recipient) + 1);
  await conv.save();

  const payload = {
    _id: msg._id, conversationId: String(conv._id), senderId: me, text: msg.text, createdAt: msg.createdAt,
  };

  const io = req.app.get('io');
  if (io) {
    io.to(`conv:${conv._id}`).emit('message:new', payload);
    io.to(`user:${recipient}`).emit('conversation:update', { conversationId: String(conv._id), lastMessage: conv.lastMessage });
  }
  notifyUser(recipient, {
    title: 'Yangi xabar',
    body: msg.text.slice(0, 120),
    data: { type: 'message', conversationId: String(conv._id) },
  }).catch(() => {});

  res.status(201).json({ message: payload });
});

// POST /chat/conversations/:id/read
const markRead = asyncHandler(async (req, res) => {
  const me = req.user.id;
  const conv = await Conversation.findById(req.params.id);
  if (!conv || !isParticipant(conv, me)) throw ApiError.notFound('Suhbat topilmadi');
  conv.unread.set(String(me), 0);
  await conv.save();
  await Message.updateMany(
    { conversationId: conv._id, senderId: { $ne: me }, readBy: { $ne: me } },
    { $addToSet: { readBy: me } }
  );
  res.json({ ok: true });
});

module.exports = { listConversations, getOrCreateConversation, getConversation, getMessages, sendMessage, markRead };
