// Theme toggle and local clock, shared by every page.
(function () {
    var html = document.documentElement;
    var toggle = document.getElementById('themeToggle');

    // Blocked site data throws on access, so never let storage break the page.
    var read = function () {
        try {
            return localStorage.getItem('theme');
        } catch (e) {
            return null;
        }
    };

    var stored = read() || 'light';
    html.setAttribute('data-theme', stored);

    if (toggle) {
        toggle.textContent = stored === 'dark' ? '☾' : '☀';
        toggle.addEventListener('click', function () {
            var theme = html.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
            html.setAttribute('data-theme', theme);
            try {
                localStorage.setItem('theme', theme);
            } catch (e) { /* preference just won't persist */ }
            toggle.textContent = theme === 'dark' ? '☾' : '☀';
        });
    }

    // "9:41am in Columbus, Ohio" — the visitor's own clock, my city.
    var clock = document.getElementById('location-time');
    if (clock) {
        var updateTime = function () {
            var time = new Date().toLocaleTimeString('en-US', {
                hour: 'numeric',
                minute: '2-digit',
                hour12: true
            });
            clock.textContent = time.replace(/\s/g, '').toLowerCase() + ' in Columbus, Ohio';
        };
        updateTime();
        setInterval(updateTime, 30000);
    }
})();
