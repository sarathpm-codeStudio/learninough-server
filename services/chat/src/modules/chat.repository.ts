

import { supabase } from "../../../../shared/config/supabase";
import { cacheService } from "../../../../shared/cache/cache.service"
import { userRole } from "../../../../shared/constants/types";
import { pushToQueue } from "../../../../shared/utils/queue";





export const chatRepository = {


    // ─── 1. SET ONLINE ───────────────────────────────────

    setOnline: async (userId: string, platform: string) => {

        try {

            // Set in Redis — 60s TTL
            // Heartbeat every 30s keeps this alive
            await cacheService.set(
                `presence:${userId}`,
                'online',
                60
            );

            // Upsert to DB
            const { error } = await supabase
                .from('user_presence')
                .upsert({
                    user_id: userId,
                    is_online: true,
                    platform: platform ?? null,
                    updated_at: new Date().toISOString(),
                });

            if (error) {
                console.error('setOnline DB error:', error);
                throw new Error('Failed to set online status');
            }



            return true;

        } catch (error: any) {

            throw new Error(error.message);

        }
    },


    setOffline: async (userId: string) => {

        try {

            // Set in Redis — 60s TTL
            // Heartbeat every 30s keeps this alive
            await cacheService.delete(
                `presence:${userId}`
            );

            // Upsert to DB
            const { error } = await supabase
                .from('user_presence')
                .upsert({
                    user_id: userId,
                    is_online: false,
                    last_seen: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                });

            if (error) {
                console.error('setOffline DB error:', error);
                throw new Error('Failed to set offline status');
            }

            return true;

        } catch (error: any) {

            throw new Error(error.message);

        }
    },

    // ─── 2. GET ONLINE STATUS ──────────────────────────────

    getPresence: async (userId: string) => {
        try {

            // Check Redis first — fast path
            const isOnline = await cacheService.get(`presence:${userId}`);

            if (isOnline) {
                return {
                    user_id: userId,
                    is_online: true,
                    last_seen: null,
                };
            }


            // Not online — get last_seen from DB
            const { data, error } = await supabase
                .from('user_presence')
                .select('last_seen')
                .eq('user_id', userId)
                .single();

            if (error || !data) {
                return {
                    user_id: userId,
                    is_online: false,
                    last_seen: null,
                };
            }

            return {
                user_id: userId,
                is_online: false,
                last_seen: data.last_seen,
            };


        } catch (error: any) {

            throw new Error(error.message);

        }
    },


    // ─── start chat ─────────────────────────────

    startChat: async (userData: { userId: string, role: string }, receiverId: string) => {
        try {


            const match = {
                facultyId: "",
                studentId: ""
            }


            if (userData.role === userRole.FACULTY) {
                match.facultyId = userData.userId
                match.studentId = receiverId
            } else {
                match.facultyId = receiverId
                match.studentId = userData.userId
            }

            const { data: existing } = await supabase
                .from('chat_rooms')
                .select('*')
                .eq('faculty_id', match.facultyId)
                .eq('student_id', match.studentId)
                .eq('is_deleted', false)
                .maybeSingle();

            if (existing) {
                return {
                    room: existing,
                    is_new: false,
                };
            }

            const { data: room, error } = await supabase
                .from('chat_rooms')
                .insert({
                    faculty_id: match.facultyId,
                    student_id: match.studentId,
                    course_id: null,
                    type: 'DIRECT',
                    is_deleted: false,
                })
                .select()
                .single();

            return {
                room,
                is_new: true,
            };

        } catch (error: any) {

            throw new Error(error.message);
        }
    },


    sendMessage: async (data: any, userId: string) => {
        try {

            const { room_id, message_type, content, file_url, file_name, file_size } = data

            // check room 

            const { data: room, error: roomError } = await supabase
                .from('chat_rooms')
                .select('id, faculty_id, student_id')
                .eq('id', room_id)
                .eq('is_deleted', false)
                .single();

            if (roomError || !room) {
                throw new Error('Chat room not found');
            }

            // . Auto determine receiver_id
            // faculty sending → receiver is student
            // student sending → receiver is faculty
            const receiverId = room.faculty_id === userId ? room.student_id : room.faculty_id;


            //  Save message to DB

            const { data: message, error: msgError } = await supabase
                .from('chat_messages')
                .insert({
                    room_id,
                    sender_id: userId,
                    receiver_id: receiverId,
                    message_type,
                    content: content ?? null,
                    file_url: file_url ?? null,
                    file_name: file_name ?? null,
                    file_size: file_size ?? null,
                    status: 'sent',
                })
                .select()
                .single();

            if (msgError) {
                console.error('sendMessage DB error:', msgError);
                throw new Error('Failed to send message');
            }


            // Update room last_message cache
            await supabase
                .from('chat_rooms')
                .update({
                    last_message_id: message.id,
                    last_message_at: message.created_at,
                })
                .eq('id', room_id);


            const isOnline = await cacheService.get(`presence:${receiverId}`);

            if (!isOnline) {

                // Receiver is offline → push to SQS for notification

                await pushToQueue(process.env.CHAT_NOTIFICATION_QUEUE_URL!, {

                    type: 'CHAT_MESSAGE',
                    message_id: message.id,
                    room_id,
                    sender_id: userId,
                    receiver_id: receiverId,
                    message_type,
                    content: content?.substring(0, 100) ?? null,
                    file_name: file_name ?? null,



                })

                return {
                    message,
                    room,
                    is_new: false,
                }

            }

            return {
                message,
                room,
                is_new: false,
            }

        } catch (error: any) {

            throw new Error(error.messageI)
        }
    },



    markDelivered: async (messageId: string, receiverId: string) => {
        try {

            // Update message status
            const { error: updateError } = await supabase
                .from('chat_messages')
                .update({ status: 'delivered' })
                .eq('id', messageId)
                .eq('receiver_id', receiverId);

            if (updateError) {
                console.error('markDelivered error:', updateError);
                return false;
            }

            return true;

        } catch (error: any) {
            console.error('markDelivered exception:', error);
            return false;
        }
    },



    markSeen: async (messageId: string, receiverId: string) => {
        try {

            const { error: updateError } = await supabase
                .from('chat_messages')
                .update({ status: 'seen' })
                .eq('id', messageId)
                .eq('receiver_id', receiverId);

            if (updateError) {
                console.error('markRead error:', updateError);
                return false;
            }

            return true;

        } catch (error: any) {
            console.error('markRead exception:', error);
            return false;
        }
    },


    getAllMyChatRooms: async (userId: string) => {

        try {


            // 1. Get all rooms where I am faculty OR student
            const { data: rooms, error } = await supabase
                .from('chat_rooms')
                .select(`
        *,
        faculty:profiles!chat_rooms_faculty_id_fkey (
          id, name, avatar_url
        ),
        student:profiles!chat_rooms_student_id_fkey (
          id, name, avatar_url
        )
      `)
                .or(`faculty_id.eq.${userId},student_id.eq.${userId}`)
                .eq('is_deleted', false)
                .order('last_message_at', { ascending: false });

            if (error) {
                console.error('getRooms error:', error);
                throw new Error('Failed to fetch rooms');
            }

            if (!rooms || rooms.length === 0) {
                return { rooms: [] };
            }

            // 2. Get unread count for each room
            const roomIds = rooms.map(r => r.id);

            const { data: unreadMessages } = await supabase
                .from('chat_messages')
                .select('room_id')
                .in('room_id', roomIds)
                .eq('receiver_id', userId)
                .neq('status', 'seen')
                .eq('is_deleted', false);

            // Build unread count map
            const unreadMap: any = {};
            (unreadMessages ?? []).forEach(m => {
                unreadMap[m.room_id] = (unreadMap[m.room_id] ?? 0) + 1;
            });

            // 3. Get last message for each room
            const { data: lastMessages } = await supabase
                .from('chat_messages')
                .select('id, room_id, content, message_type, file_name, created_at, sender_id, status')
                .in('room_id', roomIds)
                .eq('is_deleted', false)
                .order('created_at', { ascending: false });

            // Build last message map — one per room
            const lastMessageMap: any = {};
            (lastMessages ?? []).forEach(m => {
                if (!lastMessageMap[m.room_id]) {
                    lastMessageMap[m.room_id] = m;
                }
            });


            // 4. Build enriched rooms with presence
            const enrichedRooms = await Promise.all(
                rooms.map(async (room) => {

                    // Determine other person
                    const isFaculty = room.faculty_id === userId;
                    const otherPerson = isFaculty ? room.student : room.faculty;
                    const otherId = isFaculty ? room.student_id : room.faculty_id;

                    // Check Redis for online status
                    const isOnline = await cacheService.get(`presence:${otherId}`);

                    let lastSeen = null;
                    if (!isOnline) {
                        const { data: presence } = await supabase
                            .from('user_presence')
                            .select('last_seen')
                            .eq('user_id', otherId)
                            .single();
                        lastSeen = presence?.last_seen ?? null;
                    }

                    // Build last message preview text
                    const lastMsg = lastMessageMap[room.id];
                    let lastMessagePreview = null;

                    if (lastMsg) {
                        switch (lastMsg.message_type) {
                            case 'TEXT': lastMessagePreview = lastMsg.content; break;
                            case 'IMAGE': lastMessagePreview = 'Photo'; break;
                            case 'PDF': lastMessagePreview = `File: ${lastMsg.file_name}`; break;
                            case 'VIDEO': lastMessagePreview = 'Video'; break;
                            default: lastMessagePreview = 'Message';
                        }
                    }

                    return {
                        id: room.id,
                        type: room.type,
                        created_at: room.created_at,
                        last_message_at: room.last_message_at,

                        // Other person info
                        other_person: {
                            id: otherPerson?.id,
                            name: otherPerson?.name,
                            avatar_url: otherPerson?.avatar_url,
                            is_online: !!isOnline,
                            last_seen: lastSeen,
                            // Flutter formats as "Last seen 2 min ago"
                        },

                        // Last message preview
                        last_message: lastMsg ? {
                            id: lastMsg.id,
                            preview: lastMessagePreview,
                            message_type: lastMsg.message_type,
                            created_at: lastMsg.created_at,
                            is_mine: lastMsg.sender_id === userId,
                            status: lastMsg.status,
                            // is_mine + status = show tick on my last message
                        } : null,

                        // Unread count badge
                        unread_count: unreadMap[room.id] ?? 0,
                    };
                })
            );

            return { rooms: enrichedRooms };



        } catch (error: any) {

            throw new Error(error.message)
        }
    },

    getAllChatInRoom: async (data: { roomId: string, cursor: string, limit: number }, userId: string) => {

        try {

            // 1. Verify user belongs to this room
            const { data: room } = await supabase
                .from('chat_rooms')
                .select('faculty_id, student_id')
                .eq('id', data.roomId)
                .eq('is_deleted', false)
                .single();

            if (!room) throw new Error("Room not found")

            const isMember = room.faculty_id === userId ||
                room.student_id === userId;
            if (!isMember) throw new Error("Not your room")


            // 2. Build query — newest first with cursor pagination
            let query = supabase
                .from('chat_messages')
                .select(`
        *,
        sender:profiles!chat_messages_sender_id_fkey (
          id, name, avatar_url
        )
      `)
                .eq('room_id', data.roomId)
                .eq('is_deleted', false)
                .order('created_at', { ascending: false })
                .limit(data.limit + 1); // fetch one extra to check hasMore

            // If cursor provided — get messages BEFORE this timestamp
            if (data.cursor) {
                query = query.lt('created_at', data.cursor);
            }

            const { data: messages, error } = await query;

            if (error) {
                console.error('getMessages error:', error);
                throw new Error("Failed to fetch messages")
            }

            // 3. Check if more messages exist
            const hasMore = messages.length > data.limit;
            const result = hasMore ? messages.slice(0, data.limit) : messages;
            const nextCursor = hasMore
                ? result[result.length - 1].created_at
                : null;

            // 6. Mark messages as seen
            // User is now looking at this screen
            await supabase
                .from('chat_messages')
                .update({
                    status: 'seen',
                    seen_at: new Date().toISOString(),
                })
                .eq('room_id', data.roomId)
                .eq('receiver_id', userId)
                .in('status', ['sent', 'delivered']);

            return {
                messages: result,
                next_cursor: nextCursor,
                has_more: hasMore,
            }

        } catch (error: any) {

            throw new Error(error.message)
        }
    }



}
