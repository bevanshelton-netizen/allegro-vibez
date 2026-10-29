/* ALLEGRO-VIBEZ role routing foundation.
 * Production authorization must be resolved server-side from the authenticated session.
 * This client router only selects the presentation after the server-provided role context exists.
 */
(function () {
  const roles = {
    artist: { label: 'ARTIST WORKSPACE', title: 'Your career. Your business.', nav: ['Overview','My Career','Music','Campaigns','Radio','Festivals','Charts','Bookings','Sponsors','Audience','Tasks'] },
    legacy_artist: { label: 'LEGACY ARTIST WORKSPACE', title: 'Your legacy. Your next chapter.', nav: ['Overview','My History','My Catalogue','Rights Review','Revival Campaign','Reissues','Live Revival','Radio Revival','KORA','Sponsors','International','Commercial'] },
    manager: { label: 'MANAGER WORKSPACE', title: 'Run the roster. Build the business.', nav: ['Overview','Roster','Artist Health','Releases','Campaigns','Opportunities','Radio','Festivals','Bookings','Commercial','Team','Tasks'] }
  };

  function requestedRole() {
    const params = new URLSearchParams(window.location.search);
    const value = params.get('role');
    return roles[value] ? value : 'artist';
  }

  window.ALLEGRO_ROLE_ROUTER = {
    roles,
    requestedRole,
    getContext() {
      // Replace with authenticated /api/me response before production authorization is enabled.
      return { role: requestedRole(), authenticated: false, source: 'presentation-only' };
    }
  };
})();
