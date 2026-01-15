const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

const USERS_FILE = path.join(__dirname, '..', 'data', 'users.json');

const loadUsers = () => {
    try {
        if (!fs.existsSync(USERS_FILE)) {
            const dataDir = path.dirname(USERS_FILE);
            if (!fs.existsSync(dataDir)) {
                fs.mkdirSync(dataDir, { recursive: true });
            }
            fs.writeFileSync(USERS_FILE, JSON.stringify([], null, 2));
            return [];
        }
        const data = fs.readFileSync(USERS_FILE, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error('Error loading users:', error);
        return [];
    }
};

const saveUsers = (users) => {
    try {
        fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
        return true;
    } catch (error) {
        console.error('Error saving users:', error);
        return false;
    }
};

const findUserByUsername = (username) => {
    const users = loadUsers();
    return users.find(u => u.username === username);
};

const findUserById = (id) => {
    const users = loadUsers();
    return users.find(u => u.id === id);
};

const createUser = async (name, email, username, password, role = 'user') => {
    const users = loadUsers();
    if (users.find(u => u.username === username)) {
        throw new Error('User already exists');
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newUser = {
        id: Date.now().toString(),
        name,
        email,
        username,
        password: hashedPassword,
        role,
        createdAt: new Date().toISOString()
    };

    users.push(newUser);
    saveUsers(users);

    // Return user without password
    const { password: _, ...userWithoutPassword } = newUser;
    return userWithoutPassword;
};

const setChatLock = async (userId, pin) => {
    const users = loadUsers();
    const userIndex = users.findIndex(u => u.id === userId);
    if (userIndex === -1) throw new Error('User not found');

    if (pin) {
        const salt = await bcrypt.genSalt(10);
        users[userIndex].chatLock = await bcrypt.hash(pin, salt);
    } else {
        delete users[userIndex].chatLock;
    }

    saveUsers(users);
    return true;
};

const verifyChatLock = async (userId, pin) => {
    const user = findUserById(userId);
    if (!user || !user.chatLock) return false;
    return await bcrypt.compare(pin, user.chatLock);
};

module.exports = {
    loadUsers,
    saveUsers,
    findUserByUsername,
    findUserById,
    createUser,
    setChatLock,
    verifyChatLock
};
