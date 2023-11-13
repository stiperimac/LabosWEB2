const express = require('express');
const bodyParser = require('body-parser');
const sqlite3 = require('sqlite3');
const app = express();
const cookieParser = require('cookie-parser');
const ejs = require('ejs');
const path = require('path'); 
const port = 3000;
const db = new sqlite3.Database('./db_lab2');

app.use(express.static('public'));
app.use(bodyParser.urlencoded({ extended: false })); 
app.use(cookieParser());
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views')); 


app.get('/', (req, res) => {
  res.sendFile(__dirname + '/public/index.html');

});

app.get('/sql-injection', (req, res) => {
    res.render('sql-injection', { error: null });
});
app.get ('/csrf', (req, res) => {
    tok = req.query.token;
    res.render('csrf', { error: null, token: tok });
});
app.get('/hacker', (req, res) => {
    useSafeQuery = req.query.useSafeQuery;
    console.log(useSafeQuery, "ssss");
    res.render('hacker', { useSafeQuery2: useSafeQuery});
});


app.post('/sql-injection', (req, res) => {
    const sqlQuery = req.body.sqlQuery;
    const password = req.body.passName;
    const vulnerableQuery = `SELECT * FROM users WHERE password = '${password}' AND username = '${sqlQuery}'`;
    const useSafeQuery = req.body.useSafeQuery === 'on'
    console.log('Executing SQL query:', vulnerableQuery);
    token = generateToken(sqlQuery);
    tokenQuery = `INSERT INTO token (value, username) VALUES ('${token}', '${sqlQuery}')`;
    if (useSafeQuery) {
        query = db.prepare("SELECT * FROM users WHERE username = ? AND password = ?", [sqlQuery, password]);
        query.all(sqlQuery, (err, rows) => {
            if (err) {
                console.error('SQL Error:', err);
                return res.status(500).json({ error: 'An error occurred.' });
            }
            if(rows.length == 1){
                res.cookie('user', JSON.stringify({
                    username: sqlQuery
                }));
                db.run(tokenQuery, (err) => {
                    if (err) {
                        console.error('SQL Error:', err);
                        return res.status(500).send('An error occurred.');
                    }
                });
                console.log("token is: " ,token);
                return res.render('profile', { message: 'Uspješno ste se prijavili!', token: token });
            } else if(rows.length == 0){
                return res.render('sql-injection', { error: 'Netočni podatci!' });
            }
            res.json({ results: rows });
        });
    } else {
        db.all(vulnerableQuery, (err, rows) => {
            if (err) {
                console.error('SQL Error:', err);
                return res.status(500).send('An error occurred.');
            }
            if(rows.length == 1){
                res.cookie('user', JSON.stringify({
                    username: sqlQuery
                }));
                db.run(tokenQuery, (err) => {
                    if (err) {
                        console.error('SQL Error:', err);
                        return res.status(500).send('An error occurred.');
                    }
                });
                console.log("token is: " ,token);
                return res.render('profile', { message: 'Uspješno ste se prijavili!', token: token });
            } else if(rows.length == 0){
                return res.render('sql-injection', { error: 'Netočni podatci!' });
            }
            res.json({ results: rows });
        });
    }
});



app.post('/csrf', (req, res) => {

    const newPassword = req.body.newPassword;
    const newPassword2 = req.body.newPassword2;
    const useSafeQuery = req.body.disableCSRF === 'on'
    console.log(useSafeQuery);
    const user = JSON.parse(req.cookies['user']);
    const username = user.username;
    const token = req.body.token;
    console.log(req.body);
    if(newPassword != newPassword2){
        res.render('csrf', { error: 'Lozinke se ne podudaraju!'})
        return;
    }
    const changePasswordQuery = `UPDATE users SET password = '${newPassword}' WHERE username = '${username}'`;
    console.log(useSafeQuery)
    if (useSafeQuery) { 
        const tokenQuery = `SELECT * FROM token WHERE value = '${token}' AND username = '${username}'`;
        console.log(tokenQuery);
        db.all(tokenQuery, (err, rows) => {
            if (err) {
                console.error('SQL Error:', err);
                return res.status(500).send('An error occurred.');
            }
 
        if (rows.length == 0){
            res.render('error');
        } else if (rows[0].value == token){
            db.run(changePasswordQuery, (err) => {
                if (err) {
                    console.error('SQL Error:', err);
                    return res.status(500).send('An error occurred.');
                }
            });
            console.log("fine")
            console.log(req.body.disableCSRF)
            res.render('password-changed', { useSafeQuery: req.body.disableCSRF });
        }
        });
        } else {
            db.run(changePasswordQuery, (err) => {
                if (err) {
                    console.error('SQL Error:', err);
                    return res.status(500).send('An error occurred.');
                }
                // Respond with a message (for demonstration)
        
            })
            console.log('Changing password to:', newPassword);
            res.render('password-changed', { useSafeQuery: req.body.disableCSRF });
        };

    
});
const crypto = require('crypto');

function generateToken(username) {
    const randomValue = crypto.randomBytes(16).toString('hex');
    const hash = crypto.createHash('sha256').update(username + randomValue).digest('hex');
    return hash;
}

app.get('/profile', (req, res) => {
    // Check if the username is stored in the cookie
    const username = req.cookies.user;
    if (username) {
      // User is logged in; display the username and a logout button
      res.render('profile', { username });
    } else {
      // User is not logged in; redirect to the login page
      res.redirect('/sql-injection');
    }
  });
  
  // Logout route
  app.get('/logout', (req, res) => {
    // Clear the username cookie to log the user out
    res.clearCookie('user');
    res.redirect('/sql-injection');
  });

app.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`);
});

