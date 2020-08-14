import React, {useState, useEffect} from 'react';
import {socket} from "./socket";
import ReactDOM from 'react-dom';
import styles from './styles/chat.scss';

function useSocket(socket) {

}

function Chat(props) {
    const [messages, setMessages] = useState([]);
    const [message, setMessage] = useState("");

    useEffect(() => {
        socket.on('chat/message', (messageObj) => {
            setMessages(m => m.concat([messageObj]))
        })
    }, []);

    function handleSubmit(e) {
        e.preventDefault();
        socket.emit('chat/message', message);
        setMessage("");
    }

    return <div className={styles.container}>
        <div>
            <ul id="chat-messages">
                {messages.map(m => {
                    const d = new Date(m.timestamp);
                    const dateStr = `${d.getHours()}:${d.getMinutes()}:${d.getSeconds()}`;
                    return <li>{m.sender} {dateStr}: {m.message}</li>
                })}
            </ul>
        </div>
        <form id="chat-form" onSubmit={handleSubmit}>
            <input type="text" onChange={e => setMessage(e.target.value)} value={message} />
            <button>Submit</button>
        </form>
    </div>
}

ReactDOM.render(<Chat/>, document.getElementById('chat-container'));
