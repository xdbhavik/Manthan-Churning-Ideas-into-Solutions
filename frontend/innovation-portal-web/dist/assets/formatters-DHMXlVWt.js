function r(e){if(!e)return"Not specified";try{const t=JSON.parse(e);if(t.city&&t.state)return`${t.city}, ${t.state}`;if(t.state)return t.state;if(t.city)return t.city}catch{}return e}export{r as f};
