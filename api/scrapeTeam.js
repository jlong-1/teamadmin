const axios = require('axios');
const cheerio = require('cheerio');

module.exports = async (req, res) => {
    // Vercel parses the URL parameters into req.query automatically
    const team = req.query.team || 'clemson';
    const year = req.query.year || '2026';
    
    const rosterUrl = `https://mcla.us/teams/${team}/${year}/roster`;
    const scheduleUrl = `https://mcla.us/teams/${team}/${year}/schedule`;

    try {
        const siteData = {
            settings: { name: team.toUpperCase(), initials: team.substring(0,3).toUpperCase(), primary: "#000", secondary: "#fff", bg: "#f3f4f6", cardBg: "#ffffff", text: "#1f2937" },
            games: [], players: [], news: []
        };

        // Scrape Roster
        const rosterRes = await axios.get(rosterUrl);
        const $roster = cheerio.load(rosterRes.data);
        
        $roster('.roster-list li, .roster-row').each((i, el) => {
            const textData = $roster(el).text().trim().split(/\n+/).map(s => s.trim()).filter(s => s);
            if (textData.length >= 4) {
                const numName = textData[0].split(' ');
                siteData.players.push({
                    id: Date.now() + i,
                    num: numName.shift() || "",
                    name: numName.join(' ') || "",
                    pos: textData[1] || "",
                    yr: textData[2] || "",
                    ht: textData.find(t => t.includes("'")) || "",
                    hometown: textData[textData.length - 1] || "",
                    img: "", bio: ""
                });
            }
        });

        // Scrape Schedule
        const scheduleRes = await axios.get(scheduleUrl);
        const $schedule = cheerio.load(scheduleRes.data);
        
        $schedule('.schedule-list li, table tr').each((i, el) => {
            const rowText = $schedule(el).text().trim().replace(/\s\s+/g, ' ');
            if(rowText.includes('Date') || rowText.length < 10) return;

            const isAway = rowText.includes('@');
            const scoreMatch = rowText.match(/(W|L)\s(\d+)\s-\s(\d+)/);
            
            siteData.games.push({
                id: Date.now() + i + 1000,
                date: rowText.substring(0, 10).trim(), 
                time: rowText.match(/\d{1,2}:\d{2}(am|pm)/i)?.[0] || "",
                atVs: isAway ? "at" : "vs",
                opponent: "TBD",
                logo: "", location: "", promo: "",
                scoreHome: scoreMatch ? (scoreMatch[1] === 'W' ? Math.max(scoreMatch[2], scoreMatch[3]).toString() : Math.min(scoreMatch[2], scoreMatch[3]).toString()) : "",
                scoreAway: scoreMatch ? (scoreMatch[1] === 'W' ? Math.min(scoreMatch[2], scoreMatch[3]).toString() : Math.max(scoreMatch[2], scoreMatch[3]).toString()) : "",
                recap: "", linkText: "", linkUrl: ""
            });
        });

        // Send the JSON back to the frontend
        res.status(200).json(siteData);

    } catch (error) {
        res.status(500).json({ error: 'Failed to scrape MCLA' });
    }
};
