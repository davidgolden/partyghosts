import React, {useState, useEffect} from 'react';
import {socket} from "./socket";
import ReactDOM from 'react-dom';
import styles from './styles/chat.scss';
import classNames from 'classnames';

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
        if (message.length > 0) {
            socket.emit('chat/message', message);
            setMessage("");
        }
    }

    return <div className={styles.container}>
        <div>
            <ul id="chat-messages">
                {messages.map(m => {
                    const messageClassName = classNames({
                        [styles.message]: true,
                        [styles.messageRight]: m.senderId === socket.id,
                    })
                    return <li key={m.timestamp} className={messageClassName}><span>{m.sender}: {m.message}</span></li>
                })}
            </ul>
        </div>
        <form id="chat-form" onSubmit={handleSubmit}>
            <input type="text" onChange={e => setMessage(e.target.value)} value={message} />
        </form>
    </div>
}

ReactDOM.render(<Chat/>, document.getElementById('chat-container'));
