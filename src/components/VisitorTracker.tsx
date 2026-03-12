import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

function getDeviceInfo() {
  const ua = navigator.userAgent;

  // Device type
  const isMobile = /Mobi|Android|iPhone|iPod/i.test(ua);
  const isTablet = /Tablet|iPad/i.test(ua);
  const device_type = isTablet ? 'tablet' : isMobile ? 'mobile' : 'desktop';

  // OS detection
  let os = 'Outro';
  if (/iPhone|iPad|iPod/i.test(ua)) os = 'iOS';
  else if (/Android/i.test(ua)) os = 'Android';
  else if (/Windows/i.test(ua)) os = 'Windows';
  else if (/Mac OS/i.test(ua)) os = 'macOS';
  else if (/Linux/i.test(ua)) os = 'Linux';

  // Browser detection
  let browser = 'Outro';
  if (/Edg\//i.test(ua)) browser = 'Edge';
  else if (/OPR|Opera/i.test(ua)) browser = 'Opera';
  else if (/SamsungBrowser/i.test(ua)) browser = 'Samsung Internet';
  else if (/Chrome/i.test(ua)) browser = 'Chrome';
  else if (/Safari/i.test(ua) && !/Chrome/i.test(ua)) browser = 'Safari';
  else if (/Firefox/i.test(ua)) browser = 'Firefox';

  return { device_type, os, browser, user_agent: ua };
}

function getOrCreateVisitorId(): string {
  const key = 'visitor_id';
  let id = localStorage.getItem(key);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(key, id);
  }
  return id;
}

const VisitorTracker = () => {
  useEffect(() => {
    const track = async () => {
      try {
        const visitor_id = getOrCreateVisitorId();
        const sessionKey = `visited_${new Date().toDateString()}`;

        // Only track once per day per device
        if (sessionStorage.getItem(sessionKey)) return;

        const { device_type, os, browser, user_agent } = getDeviceInfo();

        await (supabase as any).from('site_visits').insert({
          visitor_id,
          device_type,
          os,
          browser,
          screen_width: window.screen.width,
          screen_height: window.screen.height,
          referrer: document.referrer || null,
          user_agent,
        });

        sessionStorage.setItem(sessionKey, '1');
      } catch (e) {
        // Silent fail - don't break the app for analytics
        console.error('Visitor tracking error:', e);
      }
    };

    track();
  }, []);

  return null;
};

export default VisitorTracker;
