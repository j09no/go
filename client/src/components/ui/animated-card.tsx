import React from 'react';
import './animated-card.css';

interface AnimatedCardProps {
  title: string;
  imageUrl?: string;
  backgroundImage?: string;
  onDelete: () => void;
  onUpload: () => void;
  onEnter: () => void;
}

export const AnimatedCard: React.FC<AnimatedCardProps> = ({
  title,
  imageUrl = "/bgg.jpg",
  backgroundImage = "/bg.jpg",
  onDelete,
  onUpload,
  onEnter
}) => {
  return (
    <div className="card-container">
      <div className="background-card"></div>
      <div className="card" style={{ backgroundImage: `url('${backgroundImage}')` }}>
        <div className="image">
          <img src={imageUrl} alt="Book" />
        </div>
        <div className="content">
          <div className="productTitle">
            <span className="first-letter">{title.charAt(0)}</span>
            {title.slice(1)}
          </div>
          <div className="button-row">
            <button className="delete-button" onClick={onDelete}>
              <div className="trash">
                <div className="top">
                  <div className="paper"></div>
                </div>
                <div className="box"></div>
                <div className="check">
                  <svg viewBox="0 0 8 6">
                    <polyline points="1.5,3 3,4.5 6.5,1"></polyline>
                  </svg>
                </div>
              </div>
            </button>
            <button className="upload-button" onClick={onUpload}>𝗨𝗣𝗟𝗢𝗔𝗗</button>
            <button className="addtocart" onClick={onEnter}>𝗘𝗡𝗧𝗘𝗥</button>
          </div>
        </div>
      </div>
    </div>
  );
};