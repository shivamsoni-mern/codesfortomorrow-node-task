const User = require("../models/User");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { generateAccessToken, generateRefreshToken } = require("../utils/jwtUtils");


exports.register = async (req, res) => {
    try {
        const { firstName, lastName, email, password } = req.body;
        if(!firstname || !lastname || email || !password){
            throw new Error("please fill all the details")
        }
        

        const userExists = await User.findOne({ email });
        if (userExists) return res.status(400).json({ message: "User already exists" });

        const hashedPassword = await bcrypt.hash(password, 12);
        const user = await User.create({ firstName, lastName, email, password: hashedPassword });

        res.status(201).json({ status: "success", message: "User registered successfully" });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};


exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email }).select("+password");

        if (!user || !(await bcrypt.compare(password, user.password))) {
            return res.status(401).json({ message: "Invalid credentials" });
        }

        const accessToken = generateAccessToken(user._id);
        const refreshToken = generateRefreshToken(user._id);

        res.cookie("refreshToken", refreshToken, {
            httpOnly: true,
            sameSite: "strict",
            maxAge: 7 * 24 * 60 * 60 * 1000
        });

        res.status(200).json({
            status: "success",
            accessToken,
            user: { id: user._id, name: `${user.firstName} ${user.lastName}`, email: user.email }
        });
    } catch (error) {
        res.status(500).json({ message: "Server error" });
    }
};


exports.refreshToken = (req, res) => {
    const token = req.cookies.refreshToken;
    if (!token) return res.status(401).json({ message: "Not authenticated" });

    jwt.verify(token, process.env.REFRESH_SECRET, (err, decoded) => {
        if (err) return res.status(403).json({ message: "Token invalid or expired" });

        const newAccessToken = generateAccessToken(decoded.id);
        res.status(200).json({ accessToken: newAccessToken });
    });
};