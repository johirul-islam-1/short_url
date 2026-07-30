# URL-shortener

<p>this is a small learning project. This backend do simple things. Takes a long url then shorten it and then redirect to the long url if request is made to short url.</p>

## Technologies
- nodejs (express)
- database: node:sqlite

## How to Run

1. clone the repo
2. Go to the root of the repo
3. make a .env using .env.example
4. install packages
5. run this command to start the server: 
    ```
    node backend/src/server.js
    ```
6. **/api/shorten**: Method is POST. The json body will be like following example: 
    ```
    {
        "longUrl":"https://www.youtube.com"
    }
    ```
    In the response will be like:
    ```
    {
        "shortUrl": "http://localhost:3000/api/2"
    }
    ```
    here in **/api/2** , 2 is the short code
7. **/api/:id** : "http://localhost:3000/api/2" this url will be redirected to the main long url ("https://www.youtube.com")

8. **/api/:urlId/analytics/clickCount/:timeline**: "http://localhost:3000/api/1/analytics/clickCount/day" this route is for how many time a link is visited. urlId here is the alias for shortcode. timeline value is as follows: day, week, month, year. 

## API's

1. **/api/shorten** : This is a POST request. In the body of request the json key is longUrl and the value is the url.

    example: 

    ```json
        {
            "longUrl":"https://www.geeksforgeeks.org/system-design/system-design-url-shortening-service/"
        }
    ```
    the api returns the shorten url 
    the shorten url = Base url of the backend + the shortcode

2. **/api/:id** : This is a GET request. the id is shortcode. When this api is hit, browser redirects to the long url.
3. **/api/:urlId/analytics/clickCount/:timeline**: This is a GET request. this route is for how many time a link is visited. urlId here is the alias for shortcode. timeline value is as follows: day, week, month, year. 


## Explaining the project
1. The database used in this project is **sqlite** (node:sqlite).
table name is **url** and the columns are **id**,**shortUrl**,**longUrl**.
2. When the **/api/shorten** hit, the longUrl is checked if it is in the database or not. 
    - If not then the last id of the db row is taken and incremented by 1. And encoded that with base62. This is used as short code. The Base Url is the url of where the backend is hosted (http://localhost:3000). 
    the return value of this api is BaseUrl + "/api/" + shortCode.
    The short code and long url are inserted in the database
    - If found then the shortUrl is returned

3. When **/api/:id** (http://localhost:3000/api/2) route hits, the db query is made if the shortcode 2 exists. 
    - if yes, then it is redirected to the longUrl(real website)
    - else a 404 not found message is sent.
4. there is a table nae **clicks** which contains **id**, **urlId** and **clickedAt** column.
4. You can see the how many clicks in a day,week,month or year individually a link is visited by using **/api/:urlId/analytics/clickCount/:timeline**. When a timeline is set (day) the server queries db for rows what is specifically within that timeline. the timeline is iso standard. day is counted from 00:00:00 to 23:59:59. Week is counted from today + 6 days prior from today. Month is counted from start of the current month to end of the current month and same goes for year.
