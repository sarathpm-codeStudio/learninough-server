


import { supabase } from "../../../../../shared/config/supabase";
import { cacheService } from "../../../../../shared/cache/cache.service";
import {
    SNSClient,
    CreatePlatformEndpointCommand,
    PublishCommand
} from '@aws-sdk/client-sns';

const sns = new SNSClient({ region: process.env.AWS_REGION } as any);




export const chatRepository = {


    chatNotificationWorker: async (event: any) => {

        try {

            for (const record of event.Records) {

                try {

                    const job = JSON.parse(record.body);


                    // 1. Check Redis — skip if online
                    const isOnline = await cacheService.get(`presence:${job.receiver_id}`);
                    if (isOnline) {
                        console.log(`User ${job.receiver_id} online — skipping push`);
                        continue;
                    }

                    // 2. Get receiver device tokens + SNS endpoint
                    const { data: devices } = await supabase
                        .from('notification_devices')
                        .select('device_token, platform, sns_endpoint_arn')
                        .eq('user_id', job.receiver_id)
                        .eq('is_active', true);

                    if (!devices || devices.length === 0) continue;

                    // 3. Get sender name
                    const { data: sender } = await supabase
                        .from('profiles')
                        .select('name')
                        .eq('id', job.sender_id)
                        .single();


                    // 4. Build message
                    let notifBody = '';
                    switch (job.message_type) {
                        case 'TEXT': notifBody = job.content; break;
                        case 'IMAGE': notifBody = 'Sent a photo'; break;
                        case 'PDF': notifBody = `Sent a file: ${job.file_name}`; break;
                        case 'VIDEO': notifBody = 'Sent a video'; break;
                        default: notifBody = 'Sent a message';
                    }


                    // 5. Send to each device via SNS endpoint
                    for (const device of devices) {
                        try {
                            // Build platform-specific message
                            const message = buildSNSMessage({
                                title: sender?.name ?? 'New message',
                                body: notifBody,
                                platform: device.platform,
                                data: {
                                    type: 'CHAT_MESSAGE',
                                    room_id: job.room_id,
                                    message_id: job.message_id,
                                    sender_id: job.sender_id,
                                }
                            });

                            await sns.send(new PublishCommand({
                                TargetArn: device.sns_endpoint_arn,
                                Message: JSON.stringify(message),
                                MessageStructure: 'json',
                            }));

                        } catch (err: any) {
                            // Endpoint disabled = device unregistered
                            if (err.code === 'EndpointDisabled') {
                                await supabase
                                    .from('notification_devices')
                                    .update({ is_active: false })
                                    .eq('sns_endpoint_arn', device.sns_endpoint_arn);
                            }
                        }
                    }

                } catch (error: any) {

                    throw new Error(error.messageI)

                }


            }
        } catch (error: any) {

            throw new Error(error.message)
        }
    }



}


// helper


function buildSNSMessage({ title, body, platform, data }: any) {
    if (platform === 'android') {
        return {
            GCM: JSON.stringify({
                // visible notification
                notification: { title, body },
                // silent data payload — Flutter handles this in background
                data: {
                    ...data,
                    action: 'MARK_DELIVERED', // ← Flutter sees this
                },
                priority: 'high',
            })
        };
    }

    if (platform === 'ios') {
        return {
            APNS: JSON.stringify({
                aps: {
                    alert: { title, body },
                    badge: 1,
                    sound: 'default',
                    // content-available = 1 means silent background push
                    'content-available': 1,
                },
                // data Flutter reads in background
                action: 'MARK_DELIVERED',
                room_id: data.room_id,
                message_id: data.message_id,
                sender_id: data.sender_id,
            }),
            APNS_SANDBOX: JSON.stringify({
                aps: {
                    alert: { title, body },
                    badge: 1,
                    sound: 'default',
                    'content-available': 1,
                },
                action: 'MARK_DELIVERED',
                room_id: data.room_id,
                message_id: data.message_id,
                sender_id: data.sender_id,
            }),
        };
    }
}