# URL-shortener

<p>this is a small learning project. This backend do simple things. Takes a long url then shorten it and then redirect to the long url if request is made ot short url.</p>

## Technologies
- nodejs (express)
- database: node:sqlite

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


## Explaining the project
1. The database used in this project is **sqlite** (node:sqlite).
table name is **url** and the columns are **id**,**shortUrl**,**longUrl**.
2. When the **/api/shorten** hit, the longUrl is checked if it is in the database or not. 
    - If not then the last id of the db entry is taken and incremented by 1. And encoded that with base62. This is used as short code. The Base Url is the url of where the backend is hosted (http://localhost:3000). 
    the return value of this api is BaseUrl + "/api/" + shortCode.
    The short code and long url are inserted in the database
    - If found then the shortUrl is returned

3. When **/api/:id** (http://localhost:3000/api/2) route hits, the db query is made if the shortcode 2 exists. 
    - if yes, then it is redirected to the longUrl(real website)
    - else a 404 not found message is sent.

