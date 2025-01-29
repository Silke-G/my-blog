import express from 'express';
import bodyParser from 'body-parser';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = 3000;

let posts = [];

const postsFilePath = path.join(__dirname, 'posts.json');

try {
    if (fs.existsSync(postsFilePath)) {
        const data = fs.readFileSync(postsFilePath, 'utf8');
        try {
            posts = JSON.parse(data);
            console.log("Posts loaded:", posts);
        } catch (jsonError) {
            console.error("Error parsing posts.json:", jsonError);
            console.error("Data that failed to parse:", data);
        }
    } else {
        console.log("posts.json does not exist. Creating a new one.");
        fs.writeFileSync(postsFilePath, '[]');
    }
} catch (err) {
    console.error("Error reading or creating posts.json:", err);
}

app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyParser.urlencoded({ extended: true }));
app.set('view engine', 'ejs');

function createExcerpt(content, maxLength) {
    if (!content) return "";

    // 1. Decode HTML entities (like &nbsp;)
    const decodedContent = content.replace(/&nbsp;/g, ' ');

    // 2. Remove HTML tags, but preserve inter-word spacing
    const textOnly = decodedContent.replace(/<[^>]*>/g, " ").replace(/\s+/g, " "); // Replace tags with spaces


    const words = textOnly.split(/\s+/);


    if (words.length <= maxLength) {
        return textOnly.trim(); 
    } else {
        const excerpt = words.slice(0, maxLength).join(" ") + "...";
        return excerpt.trim();
    }
}


app.get('/', (req, res) => {
    const postsWithExcerpts = posts.map(post => ({
        ...post,
        excerpt: createExcerpt(post.content, 50),
    }));
    res.render('index', { posts: postsWithExcerpts });
});

app.get('/blog', (req, res) => {
    const postsWithExcerpts = posts.map(post => ({
        ...post,
        excerpt: createExcerpt(post.content, 150),
    }));
    res.render('blog', { posts: postsWithExcerpts });
});

app.get('/about', (req, res) => {
    res.render('about');
});

app.get('/create', (req, res) => {
    res.render('create-post');
});

app.post('/create', (req, res) => {
    const { title, content, author } = req.body;
    const date = new Date().toLocaleDateString();

    const timestamp = Date.now();
    const baseSlug = title.toLowerCase().replace(/ /g, '-');
    const slug = encodeURIComponent(`${baseSlug}-${timestamp}`);

    const trimmedContent = content.trim();
    const contentWithParagraphs = trimmedContent.split('\n').map(paragraph => paragraph.trim()).filter(paragraph => paragraph!== "").join('</p><p>');
    const contentWithParagraphsWrapped = `<p>${contentWithParagraphs}</p>`;

    const newPost = {
        title,
        content: contentWithParagraphsWrapped,
        author,
        date,
        slug: slug,
    };

    posts.push(newPost);

    try {
        fs.writeFileSync(postsFilePath, JSON.stringify(posts, null, 2));
        console.log("Post saved successfully.");
    } catch (writeError) {
        console.error("Error writing to posts.json:", writeError);
    }

    res.redirect('/');
});

app.get('/post/:slug', (req, res) => {
    const slug = decodeURIComponent(req.params.slug);

    console.log("Requested Slug (Decoded):", slug);
    posts.forEach(p => console.log("Post in posts array (Encoded):", p.slug));

    const post = posts.find(p => decodeURIComponent(p.slug).toLowerCase().trim() === slug.toLowerCase().trim());

    if (!post) {
        console.log("Post not found!");
        return res.status(404).send("Post not found");
    }

    res.render('post', { post: post });
});

app.get('/edit/:slug', (req, res) => {
    const slug = decodeURIComponent(req.params.slug);

    console.log("Edit route hit!");
    console.log("Requested Slug (Decoded):", slug);

    posts.forEach(p => console.log("Post in posts array (Encoded):", p.slug));

    const post = posts.find(p => decodeURIComponent(p.slug).toLowerCase().trim() === slug.toLowerCase().trim());

    if (!post) {
        console.log("Post not found!");
        return res.status(404).send("Post not found");
    }

    console.log("Post found:", post.title);

    res.render('create-post', { post: post });
});

app.post('/update/:slug', (req, res) => {
    const slug = decodeURIComponent(req.params.slug);
    const { title, content, author } = req.body;

    const postIndex = posts.findIndex(p => decodeURIComponent(p.slug).toLowerCase().trim() === slug.toLowerCase().trim());

    if (postIndex === -1) {
        console.log("Post not found for update!");
        return res.status(404).send("Post not found");
    }

    posts[postIndex] = { 
        title: title,
        content: content,
        author: author,
        date: new Date().toLocaleDateString(),
        slug: slug
    };

    try {
        fs.writeFileSync(postsFilePath, JSON.stringify(posts, null, 2));
        console.log("Post updated successfully.");
    } catch (writeError) {
        console.error("Error writing to posts.json:", writeError);
    }

    res.redirect('/post/' + slug);
});


app.post('/delete/:slug', (req, res) => {
    const slug = decodeURIComponent(req.params.slug);

    console.log("Delete route hit!");
    console.log("Requested Slug (Decoded):", slug);

    const postIndex = posts.findIndex(p => decodeURIComponent(p.slug).toLowerCase().trim() === slug.toLowerCase().trim());

    if (postIndex === -1) {
        console.log("Post not found!");
        return res.status(404).send("Post not found");
    }

    posts.splice(postIndex, 1);

    try {
        fs.writeFileSync(postsFilePath, JSON.stringify(posts, null, 2));
        console.log("Post deleted successfully.");
    } catch (writeError) {
        console.error("Error writing to posts.json:", writeError);
    }

    res.redirect('/');
});

app.listen(port, () => {
    console.log(`Server listening on port ${port}`);
});