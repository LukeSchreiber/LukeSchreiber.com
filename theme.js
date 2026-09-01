// Theme toggle and local clock, shared by every page.
(function () {
    var html = document.documentElement;
    var toggle = document.getElementById('themeToggle');

    var stored = localStorage.getItem('theme') || 'dark';
    html.setAttribute('data-theme', stored);

    if (toggle) {
        toggle.textContent = stored === 'dark' ? '☾' : '☀';
        toggle.addEventListener('click', function () {
            var theme = html.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
            html.setAttribute('data-theme', theme);
            localStorage.setItem('theme', theme);
            toggle.textContent = theme === 'dark' ? '☾' : '☀';
        });
    }

    var clock = document.getElementById('location-time');
    if (clock) {
        var updateTime = function () {
            var time = new Date().toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit',
                hour12: true
            });
            clock.textContent = 'Cleveland, OH · ' + time;
        };
        updateTime();
        setInterval(updateTime, 60000);
    }
})();
