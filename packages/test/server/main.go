package main

import (
	"fmt"
	"io/ioutil"
	"os"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
)

func GetTestRoutes(r *gin.Engine) {
	r.GET("/api/get-text", func(c *gin.Context) {
		c.String(200, "hello world")
	})
	r.GET("/api/get-json", func(c *gin.Context) {
		c.JSON(200, gin.H{
			"key": "value",
		})
	})
	r.GET("/api/get-return-headers", func(c *gin.Context) {
		for key, vals := range c.Request.Header {
			for _, val := range vals {
				c.Header(key, val)
			}
		}
	})
	r.GET("/api/get-return-body", func(c *gin.Context) {
		data, _ := ioutil.ReadAll(c.Request.Body)
		c.String(200, string(data[:]))
	})
	r.GET("/api/get-set-cookie", func(c *gin.Context) {
		c.Header("set-cookie", "foo-get=bar")
		c.Header("X-Cors", "amazing")
	})
	r.GET("/api/get-check-cookie", func(c *gin.Context) {
		if cookie, err := c.Request.Cookie("foo-get"); err != nil || cookie.Value != "bar" {
			c.Status(500)
		}
	})
	r.GET("/api/get-headers", func(c *gin.Context) {
		c.Header("X-UPPER", "X-UPPER")
		c.Header("x-lower", "x-lower")
	})
	r.GET("/api/get-query", func(c *gin.Context) {
		queryParams := c.Request.URL.Query()
		// return {"key1": ["value1"]}
		c.JSON(200, queryParams)
	})
}

func PostTestRoutes(r *gin.Engine) {
	r.POST("/api/post-text", func(c *gin.Context) {
		c.String(200, "hello world")
	})
	r.POST("/api/post-json", func(c *gin.Context) {
		c.JSON(200, gin.H{
			"key": "value",
		})
	})
	r.POST("/api/post-return-headers", func(c *gin.Context) {
		for key, vals := range c.Request.Header {
			for _, val := range vals {
				c.Header(key, val)
			}
		}
	})
	r.POST("/api/post-return-body", func(c *gin.Context) {
		data, _ := ioutil.ReadAll(c.Request.Body)
		c.Header("content-length", fmt.Sprint(len(data)))
		c.String(200, string(data[:]))
	})
	r.POST("/api/post-set-cookie", func(c *gin.Context) {
		c.Header("set-cookie", "foo-post=bar")
	})
	r.POST("/api/post-check-cookie", func(c *gin.Context) {
		if cookie, err := c.Request.Cookie("foo-post"); err != nil || cookie.Value != "bar" {
			c.Status(500)
		}
	})
}

func PutTestRoutes(r *gin.Engine) {
	r.PUT("/api/put-text", func(c *gin.Context) {
		c.String(200, "hello world")
	})
	r.PUT("/api/put-json", func(c *gin.Context) {
		c.JSON(200, gin.H{
			"key": "value",
		})
	})
	r.PUT("/api/put-return-headers", func(c *gin.Context) {
		for key, vals := range c.Request.Header {
			for _, val := range vals {
				c.Header(key, val)
			}
		}
	})
	r.PUT("/api/put-return-body", func(c *gin.Context) {
		data, _ := ioutil.ReadAll(c.Request.Body)
		c.String(200, string(data[:]))
	})
}

func DeleteTestRoutes(r *gin.Engine) {
	r.DELETE("/api/delete-text", func(c *gin.Context) {
		c.String(200, "hello world")
	})
	r.DELETE("/api/delete-json", func(c *gin.Context) {
		c.JSON(200, gin.H{
			"key": "value",
		})
	})
	r.DELETE("/api/delete-return-headers", func(c *gin.Context) {
		for key, vals := range c.Request.Header {
			for _, val := range vals {
				c.Header(key, val)
			}
		}
	})
	r.DELETE("/api/delete-return-body", func(c *gin.Context) {
		data, _ := ioutil.ReadAll(c.Request.Body)
		c.String(200, string(data[:]))
	})
}

func PatchTestRoutes(r *gin.Engine) {
	r.PATCH("/api/patch-text", func(c *gin.Context) {
		c.String(200, "hello world")
	})
	r.PATCH("/api/patch-json", func(c *gin.Context) {
		c.JSON(200, gin.H{
			"key": "value",
		})
	})
	r.PATCH("/api/patch-return-headers", func(c *gin.Context) {
		for key, vals := range c.Request.Header {
			for _, val := range vals {
				c.Header(key, val)
			}
		}
	})
	r.PATCH("/api/patch-return-body", func(c *gin.Context) {
		data, _ := ioutil.ReadAll(c.Request.Body)
		c.String(200, string(data[:]))
	})
}

func HeadTestRoutes(r *gin.Engine) {
	r.HEAD("/api/head-text", func(c *gin.Context) {
		// c.String(200, "hello world")
	})
	r.HEAD("/api/head-json", func(c *gin.Context) {
		// c.JSON(200, gin.H{
		// 	"key": "value",
		// })
	})
}

func DemoRoutes(r *gin.Engine) {
	r.GET("/api/res-json", func(c *gin.Context) {
		c.JSON(200, gin.H{
			"key": "value",
		})
	})

	r.GET("/api/res-json-content-type-json", func(c *gin.Context) {
		c.Header("Content-Type", "application/json")
		c.JSON(200, gin.H{
			"key": "value",
		})
	})

	r.GET("/api/res-text", func(c *gin.Context) {
		c.String(200, "ok")
	})

	r.POST("/api/res-json", func(c *gin.Context) {
		c.JSON(200, gin.H{
			"key": "value",
		})
	})

	r.POST("/api/res-json-content-type-json", func(c *gin.Context) {
		c.Header("Content-Type", "application/json")
		c.JSON(200, gin.H{
			"key": "value",
		})
	})
}

func ErrorTestRoutes(r *gin.Engine) {
	r.POST("/api/error", func(c *gin.Context) {
		c.Header("Content-Type", "application/json")
		c.JSON(500, gin.H{
			"key": "value",
		})
	})
}

var flakyMutex sync.Mutex
var flakyAttempts = map[string]int{}

func UtilTestRoutes(r *gin.Engine) {
	// Responds with the received request
	r.Any("/api/echo", func(c *gin.Context) {
		body, _ := ioutil.ReadAll(c.Request.Body)
		headers := map[string]string{}
		for key, vals := range c.Request.Header {
			headers[strings.ToLower(key)] = strings.Join(vals, ", ")
		}
		c.JSON(200, gin.H{
			"method":  c.Request.Method,
			"url":     c.Request.URL.String(),
			"query":   c.Request.URL.Query(),
			"headers": headers,
			"body":    string(body),
		})
	})
	// Responds after `ms` milliseconds
	r.GET("/api/delay", func(c *gin.Context) {
		ms, _ := strconv.Atoi(c.DefaultQuery("ms", "1000"))
		select {
		case <-time.After(time.Duration(ms) * time.Millisecond):
			c.String(200, "delayed")
		case <-c.Request.Context().Done():
		}
	})
	// Responds with 503 for the first `fail` requests of the same `id`
	r.GET("/api/flaky", func(c *gin.Context) {
		id := c.Query("id")
		fail, _ := strconv.Atoi(c.DefaultQuery("fail", "1"))
		flakyMutex.Lock()
		flakyAttempts[id]++
		attempt := flakyAttempts[id]
		flakyMutex.Unlock()
		if attempt <= fail {
			c.JSON(503, gin.H{"attempt": attempt})
			return
		}
		c.JSON(200, gin.H{"attempt": attempt})
	})
	r.Any("/api/status/:code", func(c *gin.Context) {
		code, _ := strconv.Atoi(c.Param("code"))
		c.Header("X-Status", c.Param("code"))
		c.JSON(code, gin.H{"status": code})
	})
}

func StaticRoutes(r *gin.Engine) {
	r.Static("/es", "../es")
	r.StaticFile("/", "./index.html")
}

func main() {
	fmt.Println("hello")
	r := gin.Default()
	corsRoutes := gin.New()

	StaticRoutes(r)

	corsRoutes.Use(cors.New(cors.Config{
		AllowOrigins:     []string{"http://localhost:8091", "http://localhost:3000"},
		AllowMethods:     []string{"GET", "POST"},
		ExposeHeaders:    []string{"X-Cors", "Set-Cookie"},
		AllowCredentials: true,
	}))

	GetTestRoutes(corsRoutes)
	PostTestRoutes(corsRoutes)

	GetTestRoutes(r)
	PostTestRoutes(r)
	DeleteTestRoutes(r)
	PatchTestRoutes(r)
	HeadTestRoutes(r)
	PutTestRoutes(r)

	ErrorTestRoutes(r)
	UtilTestRoutes(r)

	r.Use(func(c *gin.Context) {
		fmt.Println("[request.url]", c.Request.URL)
		fmt.Println("[request.headers]")
		for k, vals := range c.Request.Header {
			fmt.Print(k, ":")
			for _, val := range vals {
				fmt.Print(val, ", ")
			}
		}
		fmt.Println()
		body, _ := ioutil.ReadAll(c.Request.Body)
		fmt.Println("[request.body]", string(body))
	})

	DemoRoutes(r)

	if len(os.Args) >= 2 && os.Args[1] == "cors" {
		corsRoutes.Run(":8092")
	} else {
		r.Run(":8091") // 8091
	}
}
