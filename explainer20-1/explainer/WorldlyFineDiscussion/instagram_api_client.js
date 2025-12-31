const fetch = require('node-fetch');

class InstagramGraphAPI {
  constructor(pageAccessToken, pageId) {
    this.pageAccessToken = pageAccessToken;
    this.pageId = pageId;
    this.apiVersion = 'v18.0';
    this.baseURL = `https://graph.facebook.com/${this.apiVersion}`;
  }

  // دریافت لیست مکالمات
  async getConversations() {
    try {
      const response = await fetch(
        `${this.baseURL}/${this.pageId}/conversations?fields=participants,messages{from,message,created_time}&access_token=${this.pageAccessToken}`
      );
      const data = await response.json();
      
      if (data.error) {
        console.error('Graph API Error:', data.error);
        return [];
      }
      
      return data.data || [];
    } catch (error) {
      console.error('Error fetching conversations:', error);
      return [];
    }
  }

  // دریافت پیام‌های یک مکالمه
  async getMessages(conversationId) {
    try {
      const response = await fetch(
        `${this.baseURL}/${conversationId}/messages?fields=from,message,created_time&access_token=${this.pageAccessToken}`
      );
      const data = await response.json();
      
      if (data.error) {
        console.error('Graph API Error:', data.error);
        return [];
      }
      
      return data.data || [];
    } catch (error) {
      console.error('Error fetching messages:', error);
      return [];
    }
  }

  // دریافت اطلاعات کاربر از sender ID
  async getUserInfo(userId) {
    try {
      const response = await fetch(
        `${this.baseURL}/${userId}?fields=username,name&access_token=${this.pageAccessToken}`
      );
      const data = await response.json();
      
      if (data.error) {
        console.error('Graph API Error:', data.error);
        return null;
      }
      
      return data;
    } catch (error) {
      console.error('Error fetching user info:', error);
      return null;
    }
  }

  // ارسال پیام متنی
  async sendTextMessage(recipientId, message) {
    try {
      const response = await fetch(
        `${this.baseURL}/${this.pageId}/messages`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            recipient: { id: recipientId },
            message: { text: message },
            access_token: this.pageAccessToken
          })
        }
      );
      const data = await response.json();
      
      if (data.error) {
        console.error('Graph API Error:', data.error);
        return { success: false, error: data.error };
      }
      
      return { success: true, data };
    } catch (error) {
      console.error('Error sending message:', error);
      return { success: false, error: error.message };
    }
  }

  // ارسال Product Card (Template Message)
  async sendProductCard(recipientId, product) {
    try {
      const message = {
        recipient: { id: recipientId },
        message: {
          attachment: {
            type: 'template',
            payload: {
              template_type: 'generic',
              elements: [{
                title: product.name,
                subtitle: `قیمت: ${product.price} → ${product.discountPrice} (۴۰٪ تخفیف)`,
                image_url: product.imageUrl || this.getDefaultImage(product.brand),
                default_action: {
                  type: 'web_url',
                  url: product.productUrl,
                  webview_height_ratio: 'tall'
                },
                buttons: [{
                  type: 'web_url',
                  url: product.productUrl,
                  title: '🛒 خرید محصول',
                  webview_height_ratio: 'tall'
                }]
              }]
            }
          }
        },
        access_token: this.pageAccessToken
      };

      const response = await fetch(
        `${this.baseURL}/${this.pageId}/messages`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(message)
        }
      );
      const data = await response.json();
      
      if (data.error) {
        console.error('Graph API Error:', data.error);
        return { success: false, error: data.error };
      }
      
      return { success: true, data };
    } catch (error) {
      console.error('Error sending product card:', error);
      return { success: false, error: error.message };
    }
  }

  // ارسال چندین Product Card
  async sendMultipleProductCards(recipientId, products) {
    const elements = products.slice(0, 10).map(product => ({
      title: product.name,
      subtitle: `قیمت: ${product.price} → ${product.discountPrice}`,
      image_url: product.imageUrl || this.getDefaultImage(product.brand),
      default_action: {
        type: 'web_url',
        url: product.productUrl,
        webview_height_ratio: 'tall'
      },
      buttons: [{
        type: 'web_url',
        url: product.productUrl,
        title: '🛒 خرید',
        webview_height_ratio: 'tall'
      }]
    }));

    try {
      const message = {
        recipient: { id: recipientId },
        message: {
          attachment: {
            type: 'template',
            payload: {
              template_type: 'generic',
              elements: elements
            }
          }
        },
        access_token: this.pageAccessToken
      };

      const response = await fetch(
        `${this.baseURL}/${this.pageId}/messages`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(message)
        }
      );
      const data = await response.json();
      
      if (data.error) {
        console.error('Graph API Error:', data.error);
        return { success: false, error: data.error };
      }
      
      return { success: true, data };
    } catch (error) {
      console.error('Error sending multiple product cards:', error);
      return { success: false, error: error.message };
    }
  }

  getDefaultImage(brand) {
    const defaultImages = {
      'misswake': 'https://luxirana.com/default-misswake.jpg',
      'collamin': 'https://luxirana.com/default-collamin.jpg',
      'pixxel': 'https://luxirana.com/default-pixxel.jpg',
      'iceball': 'https://luxirana.com/default-iceball.jpg',
      'میسویک': 'https://luxirana.com/images/misswake-default.jpg',
      'کلامین': 'https://luxirana.com/images/collamin-default.jpg',
      'آیس‌بال': 'https://luxirana.com/images/iceball-default.jpg',
    };
    return defaultImages[brand?.toLowerCase()] || 'https://luxirana.com/images/default-product.jpg';
  }
}

module.exports = { InstagramGraphAPI };

