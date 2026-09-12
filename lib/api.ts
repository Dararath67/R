const getApiBaseUrl = () => {
  if (typeof window !== 'undefined') return '/api';
  return process.env.NEXT_PUBLIC_API_URL || 'http://us.apsara.lol:15511/api';
};

const API_BASE_URL = getApiBaseUrl();
const SECONDARY_API_URL = process.env.NEXT_PUBLIC_SECONDARY_API_URL || 'https://r-diut.onrender.com/api';

async function fetchWithFailover(path: string, options: RequestInit = {}): Promise<Response> {
  const primaryUrl = `${API_BASE_URL}${path}`;
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3500);
    const res = await fetch(primaryUrl, { ...options, signal: controller.signal });
    clearTimeout(timeoutId);
    if (res.ok || res.status < 500) {
      return res;
    }
  } catch (e) {
    console.warn(`Primary backend unreachable (${primaryUrl}), trying secondary backend...`, e);
  }

  // Failover to Render.com secondary server
  const secondaryUrl = `${SECONDARY_API_URL}${path}`;
  try {
    return await fetch(secondaryUrl, options);
  } catch (err) {
    console.error(`Secondary backend also unreachable (${secondaryUrl}):`, err);
  }

  return await fetch(primaryUrl, options);
}

function getAuthHeader(): Record<string, string> {
  if (typeof window === 'undefined') return {};
  try {
    const saved = localStorage.getItem('movie_app_fastapi_user_session');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed?.token) {
        return { Authorization: `Bearer ${parsed.token}` };
      }
    }
  } catch {}
  return {};
}

export const api = {
  // Direct File Uploads
  async uploadVideo(file: File) {
    const formData = new FormData();
    formData.append('file', file);

    const res = await fetch(`${API_BASE_URL}/upload/video`, {
      method: 'POST',
      headers: { ...getAuthHeader() },
      body: formData,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'បរាជ័យក្នុងការ Upload វីដេអូ (Video upload failed)');
    }
    return await res.json();
  },

  async downloadVideoFromUrl(url: string) {
    const res = await fetch(`${API_BASE_URL}/upload/download-url`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify({ url }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'បរាជ័យក្នុងការទាញយកវីដេអូពី Link');
    }
    return await res.json();
  },

  async uploadImage(file: File) {
    const formData = new FormData();
    formData.append('file', file);

    const res = await fetch(`${API_BASE_URL}/upload/image`, {
      method: 'POST',
      headers: { ...getAuthHeader() },
      body: formData,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'បរាជ័យក្នុងការ Upload រូបភាព (Image upload failed)');
    }
    return await res.json();
  },

  // Movies
  async getMovies() {
    try {
      const res = await fetchWithFailover('/movies');
      if (!res.ok) return [];
      return await res.json();
    } catch {
      return [];
    }
  },

  async getSeries() {
    try {
      const res = await fetchWithFailover('/series');
      if (!res.ok) return [];
      return await res.json();
    } catch {
      return [];
    }
  },

  async getContentById(id: string) {
    try {
      const res = await fetchWithFailover(`/content/${id}`);
      if (!res.ok) return null;
      return await res.json();
    } catch {
      return null;
    }
  },

  async addMovie(movieData: any) {
    const res = await fetchWithFailover('/movies', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify(movieData),
    });
    return await res.json();
  },

  async updateMovie(id: string, movieData: any) {
    const res = await fetchWithFailover(`/movies/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify(movieData),
    });
    return await res.json();
  },

  async deleteMovie(id: string) {
    const res = await fetchWithFailover(`/movies/${id}`, {
      method: 'DELETE',
      headers: { ...getAuthHeader() },
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'បរាជ័យក្នុងការលុបភាពយន្ត');
    }
    return await res.json();
  },

  async togglePublish(id: string) {
    const res = await fetchWithFailover(`/movies/${id}/publish`, {
      method: 'PATCH',
      headers: { ...getAuthHeader() },
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'បរាជ័យក្នុងការកែប្រែស្ថានភាពបោះពុម្ព');
    }
    return await res.json();
  },

  async incrementViews(id: string) {
    const res = await fetchWithFailover(`/movies/${id}/view`, {
      method: 'POST',
    });
    return await res.json();
  },

  // Episodes
  async getEpisodes() {
    try {
      const res = await fetchWithFailover('/episodes');
      if (!res.ok) return [];
      return await res.json();
    } catch {
      return [];
    }
  },

  async addEpisode(episodeData: any) {
    const res = await fetchWithFailover('/episodes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify(episodeData),
    });
    return await res.json();
  },

  async deleteEpisode(id: string) {
    const res = await fetchWithFailover(`/episodes/${id}`, {
      method: 'DELETE',
      headers: { ...getAuthHeader() },
    });
    return await res.json();
  },

  // Genres
  async getGenres() {
    try {
      const res = await fetchWithFailover('/genres');
      if (!res.ok) return [];
      return await res.json();
    } catch {
      return [];
    }
  },

  async addGenre(name: string) {
    const res = await fetch(`${API_BASE_URL}/genres`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify({ name }),
    });
    return await res.json();
  },

  async deleteGenre(id: string) {
    try {
      const res = await fetch(`${API_BASE_URL}/genres/${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers: { ...getAuthHeader() },
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || 'បរាជ័យក្នុងការលុបប្រភេទ');
      }
      return await res.json();
    } catch (e: any) {
      console.warn('deleteGenre API call failed:', e);
      return { message: 'Genre deleted' };
    }
  },

  // Users & Auth Verification
  async verifyToken(token: string) {
    if (!token) return { valid: false, reason: 'no_token' };
    try {
      const res = await fetch(`${API_BASE_URL}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 401 || res.status === 403) {
        return { valid: false, reason: 'unauthorized' };
      }
      if (!res.ok) {
        return { valid: true, reason: 'server_busy' };
      }
      const data = await res.json();
      return { valid: true, ...data };
    } catch {
      return { valid: true, reason: 'network_error' };
    }
  },

  async getUsers() {
    try {
      const res = await fetch(`${API_BASE_URL}/users`, {
        headers: { ...getAuthHeader() },
      });
      if (!res.ok) return [];
      return await res.json();
    } catch {
      return [];
    }
  },

  async getUserSessions() {
    try {
      const res = await fetch(`${API_BASE_URL}/admin/sessions`, {
        headers: { ...getAuthHeader() },
      });
      if (!res.ok) return [];
      return await res.json();
    } catch {
      return [];
    }
  },

  async revokeUserSession(sessionId: string) {
    const res = await fetch(`${API_BASE_URL}/admin/sessions/revoke/${sessionId}`, {
      method: 'POST',
      headers: { ...getAuthHeader() },
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'បរាជ័យក្នុងការលុប Session');
    }
    return await res.json();
  },

  async login(email: string, password?: string, rolePreference?: string) {
    const lowerEmail = (email || '').toLowerCase().trim();
    try {
      const res = await fetch(`${API_BASE_URL}/users/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: lowerEmail, password: password || '', role: rolePreference || 'USER' }),
      });
      if (res.ok) {
        return await res.json();
      }
      const err = await res.json().catch(() => ({}));
      if (err.detail) {
        throw new Error(err.detail);
      }
    } catch (e: any) {
      throw e;
    }
  },

  async toggleBanUser(id: string) {
    const res = await fetch(`${API_BASE_URL}/users/${id}/ban`, {
      method: 'PATCH',
      headers: { ...getAuthHeader() },
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'បរាជ័យក្នុងការផ្អាក/បើកដំណើរការគណនី');
    }
    return await res.json();
  },

  async deleteUser(id: string) {
    const res = await fetch(`${API_BASE_URL}/users/${id}`, {
      method: 'DELETE',
      headers: { ...getAuthHeader() },
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'បរាជ័យក្នុងការលុបអ្នកប្រើប្រាស់');
    }
    return await res.json();
  },

  async toggleFavorite(contentId: string) {
    try {
      const res = await fetch(`${API_BASE_URL}/users/favorites/toggle/${contentId}`, {
        method: 'POST',
        headers: { ...getAuthHeader() },
      });
      if (!res.ok) return null;
      return await res.json();
    } catch {
      return null;
    }
  },

  // Stats
  async getStats() {
    try {
      const res = await fetch(`${API_BASE_URL}/stats`);
      if (!res.ok) return null;
      return await res.json();
    } catch {
      return null;
    }
  },

  // Comments
  async getComments(movieId: string) {
    return this.getMovieComments(movieId);
  },

  async addComment(commentData: any) {
    return this.postMovieComment(commentData.movieId || commentData.contentId, commentData.content || commentData.comment, commentData.rating);
  },

  // Banner Settings
  async getBannerSettings() {
    try {
      const res = await fetch(`${API_BASE_URL}/settings/banner`);
      if (!res.ok) return null;
      return await res.json();
    } catch {
      return null;
    }
  },

  async register(name: string, email: string, password: string, avatar?: string) {
    const res = await fetch(`${API_BASE_URL}/users/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password, avatar }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Registration failed');
    }
    return await res.json();
  },

  async updateProfile(userId: string, data: { name?: string; email?: string; avatar?: string }) {
    const res = await fetch(`${API_BASE_URL}/users/profile`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, ...data }),
    });
    if (!res.ok) throw new Error('Profile update failed');
    return await res.json();
  },

  async changePassword(userId: string, oldPassword?: string, newPassword?: string) {
    const res = await fetch(`${API_BASE_URL}/users/change-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify({ userId, oldPassword, newPassword }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Failed to change password');
    }
    return await res.json();
  },

  // Notifications
  async getNotifications() {
    try {
      const res = await fetch(`${API_BASE_URL}/notifications`, {
        headers: { ...getAuthHeader() },
      });
      if (!res.ok) return [];
      return await res.json();
    } catch {
      return [];
    }
  },

  async sendNotification(notifData: any) {
    try {
      const res = await fetch(`${API_BASE_URL}/notifications`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(notifData),
      });
      return await res.json();
    } catch {
      return notifData;
    }
  },

  async markNotificationsRead() {
    try {
      const res = await fetch(`${API_BASE_URL}/notifications/read-all`, {
        method: 'POST',
      });
      return await res.json();
    } catch {
      return null;
    }
  },

  async deleteNotification(id: string) {
    try {
      const res = await fetch(`${API_BASE_URL}/notifications/${id}`, {
        method: 'DELETE',
      });
      return await res.json();
    } catch {
      return null;
    }
  },

  async clearAllNotifications() {
    try {
      const res = await fetch(`${API_BASE_URL}/notifications`, {
        method: 'DELETE',
      });
      return await res.json();
    } catch {
      return null;
    }
  },

  async updateBannerSettings(settings: any) {
    try {
      const res = await fetch(`${API_BASE_URL}/settings/banner`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify(settings),
      });
      return await res.json();
    } catch {
      return settings;
    }
  },

  // Security Audit Logs & Protection Matrix
  async getSecurityHealth() {
    try {
      const res = await fetch(`${API_BASE_URL}/security/health`);
      if (!res.ok) return null;
      return await res.json();
    } catch {
      return null;
    }
  },

  async getSecurityLogs() {
    try {
      const res = await fetch(`${API_BASE_URL}/admin/security-logs`, {
        headers: { ...getAuthHeader() },
      });
      if (!res.ok) return [];
      return await res.json();
    } catch {
      return [];
    }
  },

  // IP Banning Management
  async getBannedIps() {
    try {
      const res = await fetch(`${API_BASE_URL}/admin/banned-ips`, {
        headers: { ...getAuthHeader() },
      });
      if (!res.ok) return [];
      return await res.json();
    } catch {
      return [];
    }
  },

  async banIp(ipAddress: string, reason?: string) {
    const res = await fetch(`${API_BASE_URL}/admin/banned-ips`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify({ ipAddress, reason: reason || 'Banned by Admin' }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Failed to ban IP address');
    }
    return await res.json();
  },

  async unbanIp(ipAddress: string) {
    const res = await fetch(`${API_BASE_URL}/admin/banned-ips/${encodeURIComponent(ipAddress)}`, {
      method: 'DELETE',
      headers: { ...getAuthHeader() },
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Failed to unban IP address');
    }
    return await res.json();
  },

  // Telegram Bot Settings
  async getTelegramSettings() {
    try {
      const res = await fetch(`${API_BASE_URL}/admin/settings/telegram`, {
        headers: { ...getAuthHeader() },
      });
      if (res.ok) {
        const data = await res.json();
        if (data && (data.telegramBotToken || data.telegramChatId)) {
          if (typeof window !== 'undefined') {
            localStorage.setItem('telegram_bot_token', data.telegramBotToken || '');
            localStorage.setItem('telegram_chat_id', data.telegramChatId || '');
          }
          return data;
        }
      }
    } catch {}
    let token = '';
    let chatId = '';
    if (typeof window !== 'undefined') {
      token = localStorage.getItem('telegram_bot_token') || '';
      chatId = localStorage.getItem('telegram_chat_id') || '';
    }
    return { telegramBotToken: token, telegramChatId: chatId };
  },

  async saveTelegramSettings(telegramBotToken: string, telegramChatId: string) {
    if (typeof window !== 'undefined') {
      localStorage.setItem('telegram_bot_token', telegramBotToken);
      localStorage.setItem('telegram_chat_id', telegramChatId);
    }
    try {
      const res = await fetch(`${API_BASE_URL}/admin/settings/telegram`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify({ telegramBotToken, telegramChatId }),
      });
      if (res.ok) {
        return await res.json();
      }
    } catch (e: any) {}
    return { message: 'បានរក្សាទុក Telegram Bot Token & Chat ID រួចរាល់! (Saved successfully)' };
  },

  async testTelegramSettings(telegramBotToken: string, telegramChatId: string) {
    try {
      const res = await fetch(`${API_BASE_URL}/admin/settings/telegram/test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify({ telegramBotToken, telegramChatId }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || 'Failed to send Telegram test message');
      }
      return await res.json();
    } catch (e: any) {
      if (telegramBotToken && telegramChatId) {
        try {
          const url = `https://api.telegram.org/bot${telegramBotToken}/sendMessage`;
          const text = `🔔 <b>TERK TLA Security Alert Test</b>\n<b>Time:</b> ${new Date().toLocaleString()}\n<b>Status:</b> Telegram Bot connected successfully!`;
          const tgRes = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chat_id: telegramChatId, text, parse_mode: 'HTML' })
          });
          if (tgRes.ok) {
            return { message: 'សារសាកល្បងត្រូវបានផ្ញើទៅ Telegram ដោយជោគជ័យ! (Test alert sent!)' };
          }
        } catch {}
      }
      throw new Error(e.message || 'បរាជ័យក្នុងការផ្ញើសារសាកល្បងទៅ Telegram');
    }
  },

  async setTelegramWebhook() {
    const res = await fetch(`${API_BASE_URL}/admin/settings/telegram/set-webhook`, {
      method: 'POST',
      headers: { ...getAuthHeader() },
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'បរាជ័យក្នុងការភ្ជាប់ Telegram Webhook');
    }
    return await res.json();
  },

  async getLatestTelegramUpload() {
    try {
      const res = await fetchWithFailover('/telegram/latest-upload');
      if (!res.ok) return { url: '', filename: '', timestamp: 0 };
      return await res.json();
    } catch {
      return { url: '', filename: '', timestamp: 0 };
    }
  },

  // Active User Sessions & Force Logout
  async getActiveSessions() {
    try {
      const res = await fetch(`${API_BASE_URL}/admin/sessions`, {
        headers: { ...getAuthHeader() },
      });
      if (!res.ok) return [];
      return await res.json();
    } catch {
      return [];
    }
  },

  async revokeSession(sessionId: string) {
    const res = await fetch(`${API_BASE_URL}/admin/sessions/${sessionId}`, {
      method: 'DELETE',
      headers: { ...getAuthHeader() },
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Failed to revoke session');
    }
    return await res.json();
  },

  // Database Backup & Restore
  async downloadDatabaseBackup() {
    const res = await fetch(`${API_BASE_URL}/admin/system/backup`, {
      headers: { ...getAuthHeader() },
    });
    if (!res.ok) throw new Error('Failed to download database backup');
    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `movies_backup_${new Date().toISOString().slice(0, 10)}.db`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  },

  async restoreDatabase(file: File) {
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch(`${API_BASE_URL}/admin/system/restore`, {
      method: 'POST',
      headers: { ...getAuthHeader() },
      body: formData,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Failed to restore database');
    }
    return await res.json();
  },

  // Movie Comments & Ratings
  async getMovieComments(contentId: string) {
    try {
      const res = await fetch(`${API_BASE_URL}/movies/${contentId}/comments`);
      if (!res.ok) return [];
      return await res.json();
    } catch {
      return [];
    }
  },

  async postMovieComment(contentId: string, comment: string, rating: number = 5.0) {
    const res = await fetch(`${API_BASE_URL}/movies/${contentId}/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify({ comment, rating }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Failed to post comment');
    }
    return await res.json();
  },

  async deleteMovieComment(commentId: string) {
    const res = await fetch(`${API_BASE_URL}/admin/comments/${commentId}`, {
      method: 'DELETE',
      headers: { ...getAuthHeader() },
    });
    if (!res.ok) throw new Error('Failed to delete comment');
    return await res.json();
  },

  // Auto-Resume Watch History Progress
  async saveWatchProgress(contentId: string, currentTime: number, duration: number, contentType: string = 'movie', episodeId?: string) {
    try {
      await fetch(`${API_BASE_URL}/watch-history/progress`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify({ contentId, currentTime, duration, contentType, episodeId }),
      });
    } catch {
      // Silent catch for background progress save
    }
  },

  async getWatchProgress(contentId: string) {
    try {
      const res = await fetch(`${API_BASE_URL}/watch-history/progress/${contentId}`, {
        headers: { ...getAuthHeader() },
      });
      if (!res.ok) return { currentTime: 0, duration: 0, progress: 0 };
      return await res.json();
    } catch {
      return { currentTime: 0, duration: 0, progress: 0 };
    }
  },

  // Live User Chat (Group & Private)
  async getChatMessages(roomType: string = 'GROUP', recipientId?: string) {
    try {
      let url = `${API_BASE_URL}/chat/messages?room_type=${roomType}`;
      if (recipientId) url += `&recipient_id=${recipientId}`;
      const res = await fetch(url, {
        headers: { ...getAuthHeader() },
      });
      if (!res.ok) return [];
      return await res.json();
    } catch {
      return [];
    }
  },

  async sendChatMessage(message: string, roomType: string = 'GROUP', recipientId?: string, mediaUrl?: string, mediaType?: string, replyToId?: string, replyToSender?: string, replyToText?: string) {
    const res = await fetch(`${API_BASE_URL}/chat/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify({ message, roomType, recipientId, mediaUrl, mediaType, replyToId, replyToSender, replyToText }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Failed to send message');
    }
    return await res.json();
  },

  async uploadChatFile(file: File | Blob, filename?: string) {
    const formData = new FormData();
    if (file instanceof Blob && !(file instanceof File)) {
      formData.append('file', file, filename || 'voice_note.webm');
    } else {
      formData.append('file', file);
    }

    const res = await fetch(`${API_BASE_URL}/chat/upload`, {
      method: 'POST',
      headers: { ...getAuthHeader() },
      body: formData,
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Failed to upload attachment');
    }

    return await res.json();
  },

  async getChatUsers() {
    try {
      const res = await fetch(`${API_BASE_URL}/chat/users`, {
        headers: { ...getAuthHeader() },
      });
      if (!res.ok) return [];
      return await res.json();
    } catch {
      return [];
    }
  },

  async getSupportConversations() {
    try {
      const res = await fetch(`${API_BASE_URL}/admin/support/conversations`, {
        headers: { ...getAuthHeader() },
      });
      if (!res.ok) return [];
      return await res.json();
    } catch {
      return [];
    }
  },

  async deleteChatMessage(messageId: string) {
    const res = await fetch(`${API_BASE_URL}/chat/messages/${messageId}`, {
      method: 'DELETE',
      headers: { ...getAuthHeader() },
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Failed to delete chat message');
    }
    return await res.json();
  },

  async toggleUserVip(userId: string) {
    const res = await fetch(`${API_BASE_URL}/users/${userId}/toggle-vip`, {
      method: 'POST',
      headers: { ...getAuthHeader() },
    });
    if (!res.ok) throw new Error('Failed to toggle VIP status');
    return await res.json();
  },

  async sendCallSignal(targetUserId: string, type: string, sdp?: any, candidate?: any) {
    const res = await fetch(`${API_BASE_URL}/chat/call/signal`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify({ targetUserId, type, sdp, candidate }),
    });
    if (!res.ok) return null;
    return await res.json();
  },

  async getCallSignals() {
    try {
      const res = await fetch(`${API_BASE_URL}/chat/call/signal`, {
        headers: { ...getAuthHeader() },
      });
      if (!res.ok) return [];
      return await res.json();
    } catch {
      return [];
    }
  },

  async createWatchParty(movieId: string) {
    const res = await fetch(`${API_BASE_URL}/watch-party/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify({ movieId }),
    });
    if (!res.ok) throw new Error('Failed to create watch party');
    return await res.json();
  },

  async getWatchParty(roomId: string) {
    try {
      const res = await fetch(`${API_BASE_URL}/watch-party/${roomId}`);
      if (!res.ok) return null;
      return await res.json();
    } catch {
      return null;
    }
  },

  async syncWatchParty(roomId: string, currentTime: number, isPlaying: boolean) {
    try {
      const res = await fetch(`${API_BASE_URL}/watch-party/${roomId}/sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify({ currentTime, isPlaying }),
      });
      return await res.json();
    } catch {
      return null;
    }
  },

  async getApiMovies() {
    try {
      const res = await fetch(`${API_BASE_URL}/admin/api-movies`, {
        headers: { ...getAuthHeader() },
      });
      if (!res.ok) return [];
      return await res.json();
    } catch {
      return [];
    }
  },

  async addApiMovie(payload: any) {
    const res = await fetch(`${API_BASE_URL}/admin/api-movies`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Failed to add API movie');
    }
    return await res.json();
  },

  async updateApiMovie(id: string, payload: any) {
    const res = await fetch(`${API_BASE_URL}/admin/api-movies/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Failed to update API movie');
    }
    return await res.json();
  },

  async deleteApiMovie(id: string) {
    const res = await fetch(`${API_BASE_URL}/admin/api-movies/${id}`, {
      method: 'DELETE',
      headers: { ...getAuthHeader() },
    });
    if (!res.ok) throw new Error('Failed to delete API movie');
    return await res.json();
  },

  async autoGenerateApiMovies() {
    const res = await fetch(`${API_BASE_URL}/admin/api-movies/auto-generate`, {
      method: 'POST',
      headers: { ...getAuthHeader() },
    });
    if (!res.ok) throw new Error('Failed to auto generate provider movies');
    return await res.json();
  },

  // Video Broken Link Reports
  async submitVideoReport(payload: { contentId: string; contentTitle: string; reason: string; details?: string; episodeId?: string; episodeTitle?: string }) {
    const res = await fetch(`${API_BASE_URL}/reports`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'បរាជ័យក្នុងការផ្ញើការរាយការណ៍');
    }
    return await res.json();
  },

  async getAdminReports(status?: string) {
    try {
      let url = `${API_BASE_URL}/admin/reports`;
      if (status) url += `?status=${encodeURIComponent(status)}`;
      const res = await fetch(url, {
        headers: { ...getAuthHeader() },
      });
      if (!res.ok) return [];
      return await res.json();
    } catch {
      return [];
    }
  },

  async updateReportStatus(reportId: string, status: string) {
    const res = await fetch(`${API_BASE_URL}/admin/reports/${reportId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify({ status }),
    });
    if (!res.ok) throw new Error('Failed to update report status');
    return await res.json();
  },

  // Movie Requests
  async submitMovieRequest(payload: { title: string; description?: string; genre?: string }) {
    const res = await fetch(`${API_BASE_URL}/movie-requests`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'បរាជ័យក្នុងការផ្ញើRequest');
    }
    return await res.json();
  },

  async getAdminMovieRequests(status?: string) {
    try {
      let url = `${API_BASE_URL}/admin/movie-requests`;
      if (status) url += `?status=${encodeURIComponent(status)}`;
      const res = await fetch(url, {
        headers: { ...getAuthHeader() },
      });
      if (!res.ok) return [];
      return await res.json();
    } catch {
      return [];
    }
  },

  async updateMovieRequestStatus(requestId: string, status: string, adminNote?: string) {
    const res = await fetch(`${API_BASE_URL}/admin/movie-requests/${requestId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify({ status, adminNote }),
    });
    if (!res.ok) throw new Error('Failed to update request status');
    return await res.json();
  },

  // Series Follows
  async toggleFollowSeries(contentId: string) {
    const res = await fetch(`${API_BASE_URL}/series/${contentId}/follow`, {
      method: 'POST',
      headers: { ...getAuthHeader() },
    });
    if (!res.ok) throw new Error('Failed to toggle series follow status');
    return await res.json();
  },

  async getSeriesFollowStatus(contentId: string) {
    try {
      const res = await fetch(`${API_BASE_URL}/series/${contentId}/follow-status`, {
        headers: { ...getAuthHeader() },
      });
      if (!res.ok) return { isFollowing: false };
      return await res.json();
    } catch {
      return { isFollowing: false };
    }
  },

  // Smart Multi-Filter Search
  async getFilteredMovies(params: { genre?: string; year?: number; type?: string; sortBy?: string; q?: string }) {
    try {
      const queryParams = new URLSearchParams();
      if (params.genre) queryParams.set('genre', params.genre);
      if (params.year) queryParams.set('year', params.year.toString());
      if (params.type) queryParams.set('type', params.type);
      if (params.sortBy) queryParams.set('sort_by', params.sortBy);
      if (params.q) queryParams.set('q', params.q);

      const res = await fetch(`${API_BASE_URL}/movies/filter?${queryParams.toString()}`);
      if (!res.ok) return [];
      return await res.json();
    } catch {
      return [];
    }
  },

  // Admin Analytics
  async getAdminAnalytics() {
    try {
      const res = await fetch(`${API_BASE_URL}/admin/analytics`, {
        headers: { ...getAuthHeader() },
      });
      if (!res.ok) return null;
      return await res.json();
    } catch {
      return null;
    }
  },
};

