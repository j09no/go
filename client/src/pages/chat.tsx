import { useState, useRef, useEffect } from "react";
import { X, Image as ImageIcon, Paperclip, Smile, Mic, Send, Upload } from "lucide-react";
import { neon } from '@neondatabase/serverless';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

interface Message {
  id: number;
  text: string;
  timestamp: string;
  sender: "user";
}

export default function Chat() {
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showImageUpload, setShowImageUpload] = useState(false);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  // Check if Neon is configured from Replit Secrets
  const neonUrl = import.meta.env.VITE_DATABASE_URL;
  const sql = neonUrl ? neon(neonUrl) : null;

  const initDatabase = async () => {
    if (!sql) {
      console.log('Neon not configured, using localStorage fallback');
      return;
    }
    const createMessagesTableSQL = `
      CREATE TABLE IF NOT EXISTS messages (
        id SERIAL PRIMARY KEY,
        text TEXT NOT NULL,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        sender VARCHAR(50) NOT NULL
      );
    `;

    const createBgieTableSQL = `
      CREATE TABLE IF NOT EXISTS bgie (
        id SERIAL PRIMARY KEY,
        image_url TEXT NOT NULL,
        image_data TEXT NOT NULL,
        uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;

    try {
      await sql(createMessagesTableSQL);
      await sql(createBgieTableSQL);
      console.log('Messages and Background Images tables initialized successfully');
    } catch (error) {
      console.error('Error initializing database:', error);
      throw error;
    }
  };

  const getMessages = async (): Promise<Message[]> => {
    if (!sql) {
      // Fallback to localStorage
      const stored = localStorage.getItem('chat_messages');
      return stored ? JSON.parse(stored) : [];
    }
    
    try {
      const result = await sql('SELECT * FROM messages ORDER BY timestamp ASC');
      
      return result.map((row: any) => ({
        id: row.id,
        text: row.text,
        timestamp: row.timestamp,
        sender: row.sender
      }));
    } catch (error) {
      console.error('Error fetching messages:', error);
      throw error;
    }
  };

  const createMessage = async (text: string, sender: string): Promise<Message> => {
    const newMessage = {
      id: Date.now(),
      text,
      timestamp: new Date().toISOString(),
      sender
    };

    if (!sql) {
      // Fallback to localStorage
      const stored = localStorage.getItem('chat_messages');
      const messages = stored ? JSON.parse(stored) : [];
      messages.push(newMessage);
      localStorage.setItem('chat_messages', JSON.stringify(messages));
      return newMessage;
    }
    
    try {
      const result = await sql(
        'INSERT INTO messages (text, sender) VALUES ($1, $2) RETURNING *',
        [text, sender]
      );

      const row = result[0];
      return {
        id: row.id,
        text: row.text,
        timestamp: row.timestamp,
        sender: row.sender
      };
    } catch (error) {
      console.error('Error creating message:', error);
      throw error;
    }
  };

  const uploadBackgroundImage = async (imageFile: File): Promise<void> => {
    if (!sql) {
      console.log('Neon not configured, using localStorage fallback');
      return;
    }

    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const base64Data = e.target?.result as string;
          const imageUrl = `bg_${Date.now()}.jpg`;
          
          // Delete all existing images first
          await sql('DELETE FROM bgie');
          console.log('Cleared existing background images');
          
          // Insert new image
          await sql(
            'INSERT INTO bgie (image_url, image_data) VALUES ($1, $2)',
            [imageUrl, base64Data]
          );
          
          console.log('Background image uploaded successfully');
          resolve();
        } catch (error) {
          console.error('Error uploading background image:', error);
          reject(error);
        }
      };
      reader.onerror = reject;
      reader.readAsDataURL(imageFile);
    });
  };

  // Load messages on component mount
  useEffect(() => {
    const initializeAndLoadMessages = async () => {
      try {
        // Initialize database first
        await initDatabase();

        // Then load messages
        const data = await getMessages();
        const formattedMessages = data.map((msg: any) => ({
          id: msg.id,
          text: msg.text,
          timestamp: msg.timestamp || new Date().toISOString(),
          sender: msg.sender
        }));
        setMessages(formattedMessages);
      } catch (error) {
        console.error('Error loading messages:', error);
      }
    };

    initializeAndLoadMessages();
  }, []);

  const alphabets = [
    // Smileys & Emotion
    "😀", "😃", "😄", "😁", "😆", "😅", "🤣", "😂", "🙂", "🙃", "🫠", "😉", "😊", "😇", "🥰", "😍", "🤩", "😘", "😗", "☺️", "😚", "😙", "🥲", "😋", "😛", "😜", "🤪", "😝", "🤑", "🤗", "🤭", "🫢", "🫣", "🤫", "🤔", "🫡", "🤐", "🤨", "😐", "😑", "😶", "🫥", "😏", "😒", "🙄", "😬", "😮‍💨", "🤥", "😔", "😪", "🤤", "😴", "😷", "🤒", "🤕", "🤢", "🤮", "🤧", "🥵", "🥶", "🥴", "😵", "😵‍💫", "🤯", "🤠", "🥳", "🥸", "😎", "🤓", "🧐", "😕", "🫤", "😟", "🙁", "☹️", "😮", "😯", "😲", "😳", "🥺", "🥹", "😦", "😧", "😨", "😰", "😥", "😢", "😭", "😱", "😖", "😣", "😞", "😓", "😩", "😫", "🥱", "😤", "😡", "😠", "🤬", "😈", "👿", "💀", "☠️", "💩", "🤡", "👹", "👺", "👻", "👽", "👾", "🤖", "😺", "😸", "😹", "😻", "😼", "😽", "🙀", "😿", "😾",

    // People & Body
    "👋", "🤚", "🖐️", "✋", "🖖", "👌", "🤌", "🤏", "✌️", "🤞", "🫰", "🤟", "🤘", "🤙", "👈", "👉", "👆", "🖕", "👇", "☝️", "👍", "👎", "👊", "✊", "🤛", "🤜", "👏", "🙌", "👐", "🤲", "🤝", "🙏", "✍️", "💅", "🤳", "💪", "🦾", "🦿", "🦵", "🦶", "👂", "🦻", "👃", "🧠", "🫀", "🫁", "🦷", "🦴", "👀", "👁️", "👅", "👄", "💋", "🩸",

    // Animals & Nature
    "🐶", "🐱", "🐭", "🐹", "🐰", "🦊", "🐻", "🐼", "🐻‍❄️", "🐨", "🐯", "🦁", "🐮", "🐷", "🐽", "🐸", "🐵", "🙈", "🙉", "🙊", "🐒", "🐔", "Penguin", "🐦", "🐤", "🐣", "🐥", "🦆", "🦅", "🦉", "🦇", "🐺", "🐗", "🐴", "🦄", "🐝", "🪱", "🐛", "🦋", "🐌", "🐞", "🐜", "🪰", "🪲", "🪳", "🦟", "🦗", "🕷️", "🕸️", "🦂", "Turtle", "🐍", "Lizard", "🦖", "🦕", "🐙", "🦑", "🦐", "🦞", "🦀", "Pufferfish", "🐠", "🐟", "🐬", "🐳", "🐋", "Shark", "🐊", "Tiger", "Leopard", "Zebra", "Gorilla", "🦧", "🦣", "🐘", "🦛", "🦏", "Camel", "🐫", "Giraffe", "Kangaroo", "🦬", "🐃", "🐂", "🐄", "🐎", "Pig", "Ram", "🐑", "🦙", "Goat", "Deer", "Dog", "Poodle", "🦮", "🐕‍🦺", "Cat", "🐈‍⬛", "🪶", "Rooster", "Turkey", "🦤", "🦚", "Parrot", "Swan", "Flamingo", "Dove", "Rabbit", "Racoon", "Skunk", "Badger", "Beaver", "Otter", "Sloth", "Mouse", "Rat", "Squirrel", "Hedgehog", "🐾", "Dragon", "Dragon face", "Cactus", "🎄", "🌲", "Tree", "Palm tree", "Wood", "Seedling", "Herb", "Clover", "🍀", "🎍", "Houseplant", "🎋", "Leaf fluttering in wind", "Fallen leaf", "Maple leaf", "Mushroom", "Shell", "Rock", "Ear of rice", "Bouquet", "Tulip", "Rose", "Wilted flower", "Hibiscus", "Cherry blossom", "Daisy", "Sunflower", "Sun", "Full moon face", "Crescent moon", "First quarter moon face", "Last quarter moon face", "New moon face", "Full moon", "Waxing gibbous moon", "Last quarter moon", "Waning gibbous moon", "New moon", "Waxing crescent moon", "First quarter moon", "Waxing gibbous moon", "Moon", "Earth globe Europe-Africa", "Earth globe Americas", "Earth globe Asia-Australia", "Saturn", "Dizzy", "Star", "Glowing star", "Sparkles", "High voltage", "Comet", "Collision", "Fire", "Tornado", "Rainbow", "Sunny", "Sun behind small cloud", "Sun behind cloud", "Sun behind rain cloud", "Rain", "Thunder cloud and rain", "Thunder cloud and lightning", "Snow", "Snowflake", "Snowman", "Snowman without snow", "Wind face", "Dash", "Droplet", "Sweat droplets", "Umbrella", "Closed umbrella", "Wave", "Fog",

    // Food & Drink
    "🍇", "🍈", "🍉", "🍊", "🍋", "🍌", "🍍", "🥭", "🍎", "🍏", "🍐", "🍑", "🍒", "🍓", "🫐", "🥝", "🍅", "🫒", "🥥", "🥑", "🍆", "🥔", "🥕", "Corn", "🌶️", "🫑", "Cucumber", "Lettuce", "Broccoli", "Garlic", "Onion", "Mushroom", "Peanuts", "Beans", "Chestnut", "Bread", "Croissant", "Baguette bread", "Flatbread", "Pretzel", "Bagel", "Pancakes", "Waffle", "Cheese", "Meat on bone", "Poultry leg", "Cut of meat", "Bacon", "Hamburger", "French fries", "Pizza", "Hot dog", "Sandwich", "Taco", "Burrito", "Tamale", "Stuffed flatbread", "Falafel", "Egg", "Fried egg", "Shallow pan of food", "Pot of food", "Fondue", "Bowl with spoon", "Green salad", "Popcorn", "Butter", "Salt", "Canned food", "Bento box", "Rice cracker", "Rice ball", "Cooked rice", "Curry rice", "Steaming bowl", "Spaghetti", "Roasted sweet potato", "Oden", "Sushi", "Fried shrimp", "Fish cake with swirl", "Moon cake", "Dango", "Dumpling", "Fortune cookie", "Takeout box", "Crab", "Lobster", "Shrimp", "Squid", "Oyster", "Soft ice cream", "Shaved ice", "Ice cream", "Doughnut", "Cookie", "Birthday cake", "Shortcake", "Cupcake", "Pie", "Chocolate bar", "Candy", "Lollipop", "Custard", "Honey pot", "Baby bottle", "Glass of milk", "Coffee", "Teapot", "Tea", "Sake", "Bottle with popping cork", "Wine glass", "Cocktail glass", "Tropical drink", "Beer mug", "Clinking beer mugs", "Clinking glasses", "Tumbler glass", "Pouring liquid", "Soft drink", "Bubble tea", "Beverage box", "Mate", "Ice",

    // Travel & Places
    "🚗", "🚕", "🚙", "🚌", "🚎", "🏎️", "🚓", "🚑", "🚒", "🚐", "🛻", "🚚", "🚛", "🚜", "🏍️", "🛵", "🚲", "🛴", "🛺", "🚨", "🚔", "🚍", "🚘", "🚖", "🚡", "🚠", "🚟", "🚃", "🚋", "🚞", "🚝", "🚄", "🚅", "🚈", "🚂", "🚆", "🚇", "🚊", "🚉", "✈️", "🛫", "🛬", "🛩️", "💺", "🛰️", "🚀", "🛸", "🚁", "🛶", "⛵", "🚤", "🛥️", "🛳️", "⛴️", "🚢", "⚓", "🪝", "⛽", "🚧", "🚦", "🚥", "🗺️", "🗿", "🗽", "🗼", "🏰", "🏯", "🏟️", "🎡", "🎢", "🎠", "⛲", "⛱️", "🏖️", "🏝️", "🏜️", "🌋", "⛰️", "🏔️", "🗻", "🏕️", "⛺", "Hut", "House", "Home", "Houses", "Derelict house", "Construction", "Factory", "Office building", "Department store", "Post office", "Post office", "Hospital", "Bank", "Hotel", "Convenience store", "School", "Love hotel", "Church", "Mosque", "Hindu temple", "Synagogue", "Kaaba", "Shinto shrine", "Railway track", "Motorway", "Map of Japan", "Mount fuji", "National park", "Sunrise", "Sunrise over mountains", "Shooting star", "Firework sparkler", "Fireworks", "Cityscape at dusk", "Cityscape", "Night with stars", "Bridge", "Fog",

    // Objects
    "⌚", "📱", "📲", "💻", "⌨️", "🖥️", "🖨️", "🖱️", "🖲️", "🕹️", "🗜️", "💽", "💾", "💿", "DVD", "Videocassette", "Camera", "Camera with flash", "Video camera", "Movie camera", "Film frames", "Telephone receiver", "Telephone", "Pager", "Fax machine", "Television", "Radio", "Studio microphone", "Level slider", "Control knobs", "Compass", "Stopwatch", "Timer clock", "Alarm clock", "Mantelpiece clock", "Hourglass done", "Hourglass not done", "Satellite antenna", "Battery", "Low battery", "Electric plug", "Light bulb", "Flashlight", "Candle", "Diya lamp", "Extinguisher", "Oil drum", "Money with wings", "Dollar banknote", "Yen banknote", "Euro banknote", "Pound banknote", "Coin", "Money bag", "Credit card", "Gem stone", "Balance scale", "Ladder", "Toolbox", "Wrench", "Hammer", "Hammer and pick", "Hammer and wrench", "Mining pick", "Hand saw", "Nut and bolt", "Gear", "Mouse trap", "Brick", "Chains", "Magnet", "Pistol", "Bomb", "Firecracker", "Axe", "Knife", "Dagger", "Crossed swords", "Shield", "Cigarette", "Coffin", "Headstone", "Funeral urn", "Amphora", "Crystal ball", "Prayer beads", "Hamsa", "Barber pole", "Alembic", "Telescope", "Microscope", "Hole", "Adhesive bandage", "Stethoscope", "Pill", "Syringe", "Drop of blood", "DNA", "Microbe", "Petri dish", "Test tube", "Thermometer", "Broom", "Plunger", "Sponge", "Lotion bottle", "Bellhop bell", "Key", "Old key", "Door", "Chair", "Couch", "Bed", "Person in bed", "Teddy bear", "Nesting dolls", "Frame with picture", "Mirror", "Window", "Shopping bags", "Shopping cart", "Wrapped gift", "Balloon", "Carp streamer", "Ribbon", "Magic wand", "Party popper", "Confetti ball", "Japanese dolls", "Red paper lantern", "Wind chime", "Red envelope", "Envelope", "E-mail", "Incoming envelope", "Love letter", "Inbox tray", "Outbox tray", "Package", "Label", "Bookmark", "Open mailbox with raised flag", "Open mailbox with lowered flag", "Closed mailbox with raised flag", "Closed mailbox with lowered flag", "Postbox", "Postal horn", "Scroll", "Page with curl", "Page facing up", "Bookmark tabs", "Receipt", "Bar chart", "Chart increasing", "Chart decreasing", "Memo", "Calendar", "Date", "Wastebasket", "Card index", "File cabinet", "Voting box", "File folder", "Open file folder", "Card index dividers", "Newspaper", "Notebook", "Notebook with decorative cover", "Ledger", "Closed book", "Green book", "Blue book", "Orange book", "Books", "Open book", "Bookmark", "Paperclip", "Linked paperclips", "Triangular ruler", "Straight edge", "Abacus", "Pushpin", "Round pushpin", "Scissors", "Pen", "Fountain pen", "Fountain pen", "Brush", "Crayon", "Memo", "Pencil", "Magnifying glass tilted left", "Magnifying glass tilted right", "Locked with pen", "Locked", "Unlocked",

    // Symbols
    "❤️", "🧡", "💛", "💚", "💙", "💜", "🖤", "🤍", "🤎", "💔", "❣️", "💕", "💞", "💓", "💗", "💖", "💘", "💝", "💟", "☮️", "✝️", "☪️", "🕉️", "☸️", "✡️", "🔯", "🕎", "☯️", "☦️", "🛐", "⛎", "♈", "♉", "♊", "♋", "♌", "♍", "♎", "♏", "♐", "♑", "♒", "♓", "🆔", "⚛️", "🉑", "☢️", "☣️", "📴", "📳", "🈶", "🈚", "🈸", "🈺", "🈷️", "✴️", "🆚", "💮", "🉐", "㊙️", "㊗️", "🈴", "🈵", "🈹", "🈲", "🅰️", "🅱️", "🆎", "🆑", "🅾️", "🆘", "❌", "⭕", "🛑", "⛔", "📛", "🚫", "💯", "💢", "♨️", "🚷", "🚯", "🚳", "🚱", "🔞", "📵", "🚭", "❗", "❕", "❓", "❔", "‼️", "⁉️", "🔅", "🔆", "〽️", "⚠️", "🚸", "🔱", "⚜️", "🔰", "♻️", "✅", "🈯", "💹", "❇️", "✳️", "❎", "🌐", "💠", "Ⓜ️", "🌀", "💤", "🏧", "🚾", "♿", "🅿️", "🛗", "🈳", "🈂️", "🛂", "🛃", "🛄", "🛅", "🚹", "🚺", "🚼", "⚧️", "🚻", "🚮", "🎦", "📶", "🈁", "🔣", "ℹ️", "🔤", "🔡", "🔠", "🆖", "🆗", "🆙", "🆒", "🆕", "🆓", "0️⃣", "1️⃣", "2️⃣", "3️⃣", "4️⃣", "5️⃣", "6️⃣", "7️⃣", "8️⃣", "9️⃣", "🔟", "🔢", "#️⃣", "*️⃣", "⏏️", "▶️", "⏸️", "⏯️", "⏹️", "⏺️", "⏭️", "⏮️", "⏩", "⏪", "⏫", "⏬", "◀️", "🔼", "🔽", "➡️", "⬅️", "⬆️", "⬇️", "↗️", "↘️", "↙️", "↖️", "↕️", "↔️", "↪️", "↩️", "⤴️", "⤵️", "🔀", "🔁", "🔂", "🔄", "🔃", "🎵", "🎶", "➕", "➖", "➗", "✖️", "🟰", "♾️", "💲", "💱", "™️", "©️", "®️", "〰️", "➰", "➿", "🔚", "🔙", "🔛", "🔝", "🔜", "✔️", "☑️", "🔘", "🔴", "🟠", "🟡", "🟢", "🔵", "🟣", "⚫", "⚪", "🟤", "🔺", "🔻", "🔸", "🔹", "🔶", "🔷", "🔳", "🔲", "▪️", "▫️", "◾", "◽", "◼️", "◻️", "🟥", "🟧", "🟨", "🟩", "🟦", "🟪", "⬛", "⬜", "🟫", "🔈", "🔇", "🔉", "🔊", "🔔", "🔕", "📣", "📢", "👁️‍🗨️", "💬", "💭", "🗯️", "♠️", "♣️", "♥️", "♦️", "🃏", "🎴", "🀄", "🕐", "🕑", "🕒", "🕓", "🕔", "🕕", "🕖", "🕗", "🕘", "🕙", "🕚", "🕛", "🕜", "🕝", "🕞", "🕟", "🕠", "🕡", "🕢", "🕣", "🕤", "🕥", "🕦", "🕧",

    // Flags
    "🏁", "🚩", "🎌", "🏴", "🏳️", "🏳️‍🌈", "🏳️‍⚧️", "🏴‍☠️", "🇦🇨", "🇦🇩", "🇦🇪", "🇦🇫", "🇦🇬", "🇦🇮", "🇦🇱", "🇦🇲", "🇦🇴", "🇦🇶", "🇦🇷", "🇦🇸", "🇦🇹", "🇦🇺", "🇦🇼", "🇦🇽", "🇦🇿", "🇧🇦", "🇧🇧", "🇧🇩", "🇧🇪", "🇧🇫", "🇧🇬", "🇧🇭", "🇧🇮", "🇧🇯", "🇧🇱", "🇧🇲", "🇧🇳", "🇧🇴", "🇧🇶", "🇧🇷", "🇧🇸", "🇧🇹", "🇧🇻", "🇧🇼", "🇧🇾", "🇧🇿", "🇨🇦", "🇨🇨", "🇨🇩", "🇨🇫", "🇨🇬", "🇨🇭", "🇨🇮", "🇨🇰", "🇨🇱", "🇨🇲", "🇨🇳", "🇨🇴", "🇨🇵", "🇨🇷", "🇨🇺", "🇨🇻", "🇨🇼", "🇨🇽", "🇨🇾", "🇨🇿", "🇩🇪", "🇩🇬", "🇩🇯", "🇩🇰", "🇩🇲", "🇩🇴", "🇩🇿", "🇪🇦", "🇪🇨", "🇪🇪", "🇪🇬", "🇪🇭", "🇪🇷", "🇪🇸", "🇪🇹", "🇪🇺", "🇫🇮", "🇫🇯", "🇫🇰", "🇫🇲", "🇫🇴", "🇫🇷", "🇬🇦", "🇬🇧", "🇬🇩", "🇬🇪", "🇬🇫", "🇬🇬", "🇬🇭", "🇬🇮", "🇬🇱", "🇬🇲", "🇬🇳", "🇬🇵", "🇬🇶", "🇬🇷", "🇬🇸", "🇬🇹", "🇬🇺", "🇬🇼", "🇬🇾", "🇭🇰", "🇭🇲", "🇭🇳", "🇭🇷", "🇭🇹", "🇭🇺", "🇮🇨", "🇮🇩", "🇮🇪", "🇮🇱", "🇮🇲", "🇮🇳", "🇮🇴", "🇮🇶", "🇮🇷", "🇮🇸", "🇮🇹", "🇯🇪", "🇯🇲", "🇯🇴", "🇯🇵", "🇰🇪", "🇰🇬", "🇰🇭", "🇰🇮", "🇰🇲", "🇰🇳", "🇰🇵", "🇰🇷", "🇰🇼", "🇰🇾", "🇰🇿", "🇱🇦", "🇱🇧", "🇱🇨", "🇱🇮", "🇱🇰", "🇱🇷", "🇱🇸", "🇱🇹", "🇱🇺", "🇱🇻", "🇱🇾", "🇲🇦", "🇲🇨", "🇲🇩", "🇲🇪", "🇲🇫", "🇲🇬", "🇲🇭", "🇲🇰", "🇲🇱", "🇲🇲", "🇲🇳", "🇲🇴", "🇲🇵", "🇲🇶", "🇲🇷", "🇲🇸", "🇲🇹", "🇲🇺", "🇲🇻", "🇲🇼", "🇲🇽", "🇲🇾", "🇲🇿", "🇳🇦", "🇳🇨", "🇳🇪", "🇳🇫", "🇳🇬", "🇳🇮", "🇳🇱", "🇳🇴", "🇳🇵", "🇳🇷", "🇳🇺", "🇳🇿", "🇴🇲", "🇵🇦", "🇵🇪", "🇵🇫", "🇵🇬", "🇵🇭", "🇵🇰", "🇵🇱", "🇵🇲", "🇵🇳", "🇵🇷", "🇵🇸", "🇵🇹", "🇵🇼", "🇵🇾", "🇶🇦", "🇷🇪", "🇷🇴", "🇷🇸", "🇷🇺", "🇷🇼", "🇸🇦", "🇸🇧", "🇸🇨", "🇸🇩", "🇸🇪", "🇸🇬", "🇸🇭", "🇸🇮", "🇸🇯", "🇸🇰", "🇸🇱", "🇸🇲", "🇸🇳", "🇸🇴", "🇸🇷", "🇸🇸", "🇸🇹", "🇸🇻", "🇸🇽", "🇸🇾", "🇸🇿", "🇹🇦", "🇹🇨", "🇹🇩", "🇹🇫", "🇹🇬", "🇹🇭", "🇹🇯", "🇹🇰", "🇹🇱", "🇹🇲", "🇹🇳", "🇹🇴", "🇹🇷", "🇹🇹", "🇹🇻", "🇹🇼", "🇹🇿", "🇺🇦", "🇺🇬", "🇺🇲", "🇺🇳", "🇺🇸", "🇺🇾", "🇺🇿", "🇻🇦", "🇻🇨", "🇻🇪", "🇻🇬", "🇻🇮", "🇻🇳", "🇻🇺", "🇼🇫", "🇼🇸", "🇽🇰", "🇾🇪", "🇾🇹", "🇿🇦", "🇿🇲", "🇿🇼"
  ];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Cleanup database connection on unmount
  useEffect(() => {
    return () => {
      // No need to close connection with HTTP API
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;

    const newMessage: Message = {
      id: Date.now(),
      text: message,
      timestamp: new Date().toISOString(),
      sender: "user"
    };

    setMessages(prev => [...prev, newMessage]);
    setMessage("");

    // Save message using direct Neon API
    try {
      await createMessage(newMessage.text, newMessage.sender);
    } catch (error) {
      console.error('Error saving message:', error);
    }
  };

  const handleAlphabetSelect = (alphabet: string) => {
    setMessage(prev => prev + alphabet);
    setShowEmojiPicker(false);
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      setSelectedImage(file);
    }
  };

  const handleImageUpload = async () => {
    if (!selectedImage) return;

    setIsUploading(true);
    try {
      await uploadBackgroundImage(selectedImage);
      toast({
        title: "Success",
        description: "Background image uploaded successfully!",
      });
      setShowImageUpload(false);
      setSelectedImage(null);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to upload image",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="flex items-center justify-center w-full min-h-screen bg-[#18181b] p-4">
      <div className="relative p-4 w-full max-w-xl max-h-full">
        <div className="relative bg-[#27272a] rounded-lg shadow-2xl border border-gray-800">
          {/* Header */}
          <div className="flex items-center justify-between p-4 md:p-5 border-b border-gray-700 rounded-t">
            <h3 className="text-lg font-bold text-white">
              Send Message
            </h3>
            <button
              type="button"
              className="text-gray-400 bg-transparent hover:bg-gray-700 hover:text-white rounded-lg text-sm w-8 h-8 ms-auto inline-flex justify-center items-center transition-colors"
            >
              <X className="w-4 h-4" />
              <span className="sr-only">Close</span>
            </button>
          </div>

          {/* Messages Display */}
          <div className="p-4 max-h-96 overflow-y-auto border-b border-gray-700">
            {messages.length === 0 ? (
              <div className="text-center text-gray-400 py-8">
                <p>No messages yet</p>
                <p className="text-sm mt-1">Start a conversation!</p>
              </div>
            ) : (
              <div className="space-y-3">
                {messages.map((msg) => (
                  <div key={msg.id} className="flex justify-end">
                    <div className="max-w-xs lg:max-w-md px-4 py-2 bg-black text-white rounded-lg">
                      <p className="text-sm" style={{ fontFamily: 'Milker, "SF Pro Display", "iOS Emoji", "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", monospace, sans-serif' }}>{msg.text}</p>
                      <p className="text-xs text-transparent mt-1">
                        {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-4 md:p-5">
            <div className="relative mb-4">
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="p-4 pb-12 block w-full h-60 bg-[#18181b] border border-gray-700 rounded-lg text-white text-md focus:border-gray-600 focus:ring-0 focus:outline-none resize-none placeholder-gray-400"
                placeholder="Write a message..."
                style={{ fontFamily: 'Milker, "SF Pro Display", monospace, sans-serif' }}
                required
              />

              {/* Bottom Controls */}
              <div className="absolute bottom-0 inset-x-0 p-2 rounded-b-md">
                <div className="flex justify-between items-center">
                  {/* Left Controls */}
                  <div className="flex items-center space-x-1">
                    <button
                      type="button"
                      className="inline-flex flex-shrink-0 justify-center items-center w-10 h-10 rounded-lg text-gray-400 hover:text-white hover:bg-gray-700 transition-colors"
                    >
                      <label htmlFor="image" className="cursor-pointer">
                        <ImageIcon className="w-5 h-5" />
                        <input name="image" id="image" type="file" className="hidden" accept="image/*" />
                      </label>
                    </button>

                    <button
                      type="button"
                      className="inline-flex flex-shrink-0 justify-center items-center w-10 h-10 rounded-lg text-gray-400 hover:text-white hover:bg-gray-700 transition-colors"
                    >
                      <label htmlFor="attachment" className="cursor-pointer">
                        <Paperclip className="w-5 h-5" />
                        <input name="attachment" id="attachment" type="file" className="hidden" />
                      </label>
                    </button>

                    <button
                      type="button"
                      onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                      className="inline-flex flex-shrink-0 justify-center items-center w-10 h-10 rounded-lg text-gray-400 hover:text-white hover:bg-gray-700 transition-colors"
                    >
                      <Smile className="w-5 h-5" />
                    </button>
                  </div>

                  {/* Right Controls */}
                  <div className="flex items-center gap-x-1">
                    <button
                      type="button"
                      onClick={() => setShowImageUpload(true)}
                      className="inline-flex flex-shrink-0 justify-center items-center w-10 h-10 rounded-lg text-gray-400 hover:text-white hover:bg-gray-700 transition-colors"
                    >
                      <Upload className="w-5 h-5" />
                    </button>

                    <button
                      type="submit"
                      disabled={!message.trim()}
                      className="inline-flex flex-shrink-0 justify-center items-center w-10 h-10 rounded-lg text-white bg-black hover:bg-black focus:z-10 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      <Send className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Character Count */}
            <div className="text-xs text-gray-400 text-right">
              {message.length}/1000
            </div>
          </form>
        </div>

        {/* Alphabet Picker */}
        {showEmojiPicker && (
          <div className="absolute bottom-16 left-4 right-4 bg-[#27272a] border border-gray-700 rounded-lg p-4 max-h-64 overflow-y-auto z-50">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-medium text-white">Select Letter</h4>
              <button
                onClick={() => setShowEmojiPicker(false)}
                className="text-gray-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="grid grid-cols-6 gap-2">
              {alphabets.map((alphabet, index) => (
                <button
                  key={index}
                  onClick={() => handleAlphabetSelect(alphabet)}
                  className="w-10 h-10 flex items-center justify-center text-xl hover:bg-gray-700 rounded transition-colors"
                  style={{ fontFamily: 'Milker, "SF Pro Display", "iOS Emoji", "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", monospace, sans-serif' }}
                >
                  {alphabet}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Image Upload Modal */}
        <Dialog open={showImageUpload} onOpenChange={setShowImageUpload}>
          <DialogContent className="glass-card border-0 max-w-md">
            <DialogHeader>
              <DialogTitle className="text-white text-lg font-semibold flex items-center space-x-2">
                <Upload className="w-5 h-5 text-blue-400" />
                <span>Upload Background Image</span>
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="border-2 border-dashed border-gray-600 rounded-lg p-6 text-center">
                <input
                  ref={imageInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageSelect}
                  className="hidden"
                />
                {selectedImage ? (
                  <div className="space-y-2">
                    <ImageIcon className="w-8 h-8 text-green-400 mx-auto" />
                    <p className="text-sm text-white">{selectedImage.name}</p>
                    <p className="text-xs text-gray-400">
                      Ready to upload
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <ImageIcon className="w-8 h-8 text-gray-400 mx-auto" />
                    <p className="text-sm text-gray-300">Select an image for chapter backgrounds</p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => imageInputRef.current?.click()}
                      className="bg-gray-700 border-gray-600"
                    >
                      Browse Images
                    </Button>
                  </div>
                )}
              </div>
              <Button
                onClick={handleImageUpload}
                disabled={!selectedImage || isUploading}
                className="w-full ios-button-primary h-11 font-medium"
              >
                {isUploading ? (
                  <div className="flex items-center space-x-2">
                    <div className="ios-spinner"></div>
                    <span>Uploading...</span>
                  </div>
                ) : (
                  "Upload Background Image"
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}